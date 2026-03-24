<?php

namespace Tests\Feature;

use App\Models\Register;
use App\Models\Staff;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PosOpenSessionTest extends TestCase
{
    use RefreshDatabase;

    public function test_pos_open_session_creates_required_records(): void
    {
        $user = User::factory()->create([
            'role' => 'cashier',
            'is_active' => true,
        ]);

        $staff = Staff::create([
            'user_id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'is_active' => true,
        ]);

        $register = Register::create([
            'name' => 'Front Register',
            'location' => 'Front',
            'is_active' => true,
        ]);

        $response = $this->actingAs($user)->postJson('/api/pos/session', [
            'register_id' => $register->id,
            'staff_id' => $staff->id,
            'opening_balance' => 120.00,
        ]);

        $response->assertStatus(201);

        $sessionId = $response->json('id');

        $this->assertDatabaseHas('register_sessions', [
            'id' => $sessionId,
            'register_id' => $register->id,
            'staff_id' => $staff->id,
            'status' => 'open',
        ]);

        $this->assertDatabaseHas('pos_cashier_logs', [
            'register_session_id' => $sessionId,
            'user_id' => $user->id,
            'action' => 'login',
        ]);

        $this->assertDatabaseHas('pos_activity_logs', [
            'register_id' => $register->id,
            'staff_id' => $staff->id,
            'action' => 'register_open',
        ]);
    }
}
