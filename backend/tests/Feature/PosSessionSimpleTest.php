<?php

namespace Tests\Feature;

use App\Models\Register;
use App\Models\Staff;
use App\Models\User;
use App\Models\RegisterSession;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PosSessionSimpleTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_open_pos_session_minimal(): void
    {
        // 1. Setup
        $user = User::factory()->create(['role' => 'admin']);
        $staff = Staff::create([
            'user_id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => 'admin',
        ]);

        $register = Register::create([
            'name' => 'Test Register',
            'location' => 'Test Location',
        ]);

        $this->actingAs($user);

        // 2. Action
        $response = $this->postJson('/api/pos/session', [
            'register_id' => $register->id,
            'staff_id' => $staff->id,
            'opening_balance' => 100.00,
        ]);

        // 3. Assertions
        $response->assertStatus(201);
        $response->assertJsonStructure(['id']);

        $this->assertDatabaseHas('register_sessions', [
            'register_id' => $register->id,
            'staff_id' => $staff->id,
        ]);
        
        $this->assertDatabaseHas('pos_cashier_logs', [
            'user_id' => $user->id,
            'action' => 'login',
        ]);

        $this->assertDatabaseHas('pos_activity_logs', [
            'register_id' => $register->id,
            'action' => 'register_open',
        ]);
    }
}
