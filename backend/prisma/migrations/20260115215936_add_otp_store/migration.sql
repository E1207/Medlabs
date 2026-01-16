-- CreateTable
CREATE TABLE "otp_store" (
    "id" TEXT NOT NULL,
    "token_signature" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_store_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "otp_store_token_signature_idx" ON "otp_store"("token_signature");
