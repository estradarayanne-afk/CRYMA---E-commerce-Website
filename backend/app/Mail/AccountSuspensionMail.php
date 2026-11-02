<?php

namespace App\Mail;

use DateTimeInterface;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AccountSuspensionMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $userName,
        public ?string $reason,
        public DateTimeInterface $suspendedAt,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'CRYMA Account Suspension Notification');
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.account-suspension',
            with: [
                'userName' => $this->userName,
                'reason' => $this->reason,
                'suspendedAt' => $this->suspendedAt,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
