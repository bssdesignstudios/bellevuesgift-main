<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('document_email_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('document_type');
            $table->uuid('document_id')->nullable();
            $table->string('recipient_email');
            $table->unsignedBigInteger('sent_by_user_id')->nullable();
            $table->string('subject');
            $table->text('metadata')->nullable();
            $table->timestamp('sent_at')->useCurrent();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_email_logs');
    }
};
