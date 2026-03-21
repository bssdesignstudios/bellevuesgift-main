<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

/**
 * AdminMailController
 *
 * Provides a safe mail health-check endpoint for admins.
 * Route: POST /admin/mail/test   (auth + role:admin)
 *
 * Usage:
 *   curl -X POST https://bellevuepos.cloud/admin/mail/test \
 *     -H "Content-Type: application/json" \
 *     -d '{"email":"your@email.com"}'
 */
class AdminMailController extends Controller
{
    /**
     * Send a test email to verify SMTP is working.
     */
    public function test(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email|max:254',
        ]);

        $config = [
            'mailer'       => config('mail.default'),
            'host'         => config('mail.mailers.smtp.host'),
            'port'         => config('mail.mailers.smtp.port'),
            'encryption'   => config('mail.mailers.smtp.encryption'),
            'from_address' => config('mail.from.address'),
            'from_name'    => config('mail.from.name'),
        ];

        // Mask username in response — never expose the password
        $config['username'] = config('mail.mailers.smtp.username')
            ? substr(config('mail.mailers.smtp.username'), 0, 4) . '****'
            : '(not set)';

        try {
            Mail::raw(
                "This is a test email from Bellevue Gifts & Supplies Retail OS.\n\n" .
                "If you received this, SMTP is configured and working correctly.\n\n" .
                "Sent: " . now()->toDateTimeString() . "\n" .
                "Server: " . config('app.url'),
                function ($message) use ($request) {
                    $message
                        ->to($request->input('email'))
                        ->subject('Bellevue ROS — Mail Test ✓');
                }
            );

            return response()->json([
                'status'  => 'ok',
                'message' => 'Test email sent successfully.',
                'sent_to' => $request->input('email'),
                'config'  => $config,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Mail delivery failed: ' . $e->getMessage(),
                'config'  => $config,
            ], 503);
        }
    }

    /**
     * Return current mail configuration (no secrets).
     */
    public function status(): JsonResponse
    {
        $mailer   = config('mail.default', 'log');
        $isSmtp   = $mailer === 'smtp';
        $host     = config('mail.mailers.smtp.host', '');
        $hasPassword = (bool) config('mail.mailers.smtp.password');

        return response()->json([
            'mailer'       => $mailer,
            'ready'        => $isSmtp && $host && $hasPassword,
            'host'         => $host ?: '(not configured)',
            'port'         => config('mail.mailers.smtp.port', ''),
            'encryption'   => config('mail.mailers.smtp.encryption', ''),
            'from_address' => config('mail.from.address', ''),
            'from_name'    => config('mail.from.name', ''),
            'username'     => config('mail.mailers.smtp.username')
                ? substr(config('mail.mailers.smtp.username'), 0, 4) . '****'
                : '(not set)',
            'password_set' => $hasPassword,
        ]);
    }
}
