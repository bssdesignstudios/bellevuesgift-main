<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Quote;
use App\Models\DocumentEmailLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class AdminDocumentEmailController extends Controller
{
    public function sendQuote(Request $request, string $id)
    {
        $quote = Quote::findOrFail($id);
        $validated = $this->validateEmailRequest($request);
        $shareUrl = url("/admin/quotes/{$quote->id}/share");

        $subject = $this->sendLinkEmail($validated['email'], 'Quote', $quote->quote_number, $shareUrl, $validated['message'] ?? null);
        $this->logSend('quote', $quote->id, $validated['email'], $request->user()?->id, $subject, [
            'share_url' => $shareUrl,
            'message' => $validated['message'] ?? null,
        ]);

        return response()->json(['message' => 'Quote email sent']);
    }

    public function sendInvoice(Request $request, string $id)
    {
        $invoice = Invoice::findOrFail($id);
        $validated = $this->validateEmailRequest($request);
        $shareUrl = url("/admin/invoices/{$invoice->id}/share");

        $subject = $this->sendLinkEmail($validated['email'], 'Invoice', $invoice->invoice_number, $shareUrl, $validated['message'] ?? null);
        $this->logSend('invoice', $invoice->id, $validated['email'], $request->user()?->id, $subject, [
            'share_url' => $shareUrl,
            'message' => $validated['message'] ?? null,
        ]);

        return response()->json(['message' => 'Invoice email sent']);
    }

    public function sendStatement(Request $request)
    {
        $validated = $this->validateEmailRequest($request, [
            'customer_id' => ['nullable', 'string'],
            'date_from'   => ['nullable', 'date'],
            'date_to'     => ['nullable', 'date'],
        ]);
        $params = array_filter([
            'customer_id' => $validated['customer_id'] ?? null,
            'date_from'   => $validated['date_from'] ?? null,
            'date_to'     => $validated['date_to'] ?? null,
        ]);
        $shareUrl = url('/admin/statements/share');
        if ($params) {
            $shareUrl .= '?' . http_build_query($params);
        }

        $subject = $this->sendLinkEmail($validated['email'], 'Statement', 'Customer Statement', $shareUrl, $validated['message'] ?? null);
        $this->logSend('statement', null, $validated['email'], $request->user()?->id, $subject, [
            'share_url' => $shareUrl,
            'message' => $validated['message'] ?? null,
            'customer_id' => $validated['customer_id'] ?? null,
        ]);

        return response()->json(['message' => 'Statement email sent']);
    }

    private function validateEmailRequest(Request $request, array $extra = []): array
    {
        return $request->validate(array_merge([
            'email' => ['required', 'email'],
            'message' => ['nullable', 'string', 'max:1000'],
        ], $extra));
    }

    private function sendLinkEmail(string $email, string $label, string $number, string $url, ?string $message): string
    {
        $subject = "{$label} — {$number}";
        $body = "{$label} link: {$url}\n\n";
        if ($message) {
            $body .= "Message:\n" . Str::of($message)->trim() . "\n\n";
        }
        $body .= "If you did not expect this email, you can ignore it.";

        Mail::raw($body, function ($mail) use ($email, $subject) {
            $mail->to($email)->subject($subject);
        });

        return $subject;
    }

    private function logSend(string $type, ?string $documentId, string $email, ?int $sentBy, string $subject, array $meta): void
    {
        DocumentEmailLog::create([
            'document_type' => $type,
            'document_id' => $documentId,
            'recipient_email' => $email,
            'sent_by_user_id' => $sentBy,
            'subject' => $subject,
            'metadata' => json_encode($meta),
            'sent_at' => now(),
        ]);
    }
}
