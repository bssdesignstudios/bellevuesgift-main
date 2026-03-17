<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\RepairTicket;
use App\Models\GiftCard;

class VerifyDataSeeder extends Seeder
{
    public function run()
    {
        // Create a Repair Ticket
        RepairTicket::create([
            'ticket_number' => 'REP-' . date('Ymd') . '-001',
            'customer_name' => 'John Doe',
            'phone' => '242-555-0101',
            'email' => 'john.doe@example.com',
            'item_make' => 'Apple',
            'model_number' => 'iPhone 15 Pro',
            'problem_description' => 'Cracked Screen - Touch works but glass is shattered.',
            'service_type' => 'repair',
            'status' => 'received',
            'deposit_required' => true,
            'deposit_amount' => 50.00,
            'deposit_paid' => true,
            'labor_hours' => 1.5,
            'labor_rate' => 60.00,
            'parts_cost' => 120.00,
            'total_cost' => 210.00,
        ]);

        // Create some Gift Cards
        GiftCard::create([
            'code' => 'TEST-LAUNCH-100',
            'initial_balance' => 100.00,
            'balance' => 100.00,
            'is_active' => true,
            'notes' => 'Launch Verification Card',
        ]);

        echo "Test data seeded successfully.\n";
    }
}
