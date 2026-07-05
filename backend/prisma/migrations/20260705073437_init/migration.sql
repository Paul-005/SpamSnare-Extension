-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_web" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_web_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gen_emails" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gen_emails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flagged_site" (
    "id" TEXT NOT NULL,
    "website_address" TEXT NOT NULL,
    "flags" INTEGER NOT NULL DEFAULT 0,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flagged_site_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_web_email_key" ON "user_web"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_web_user_id_website_key" ON "user_web"("user_id", "website");

-- CreateIndex
CREATE UNIQUE INDEX "gen_emails_email_key" ON "gen_emails"("email");

-- CreateIndex
CREATE UNIQUE INDEX "flagged_site_website_address_key" ON "flagged_site"("website_address");

-- AddForeignKey
ALTER TABLE "user_web" ADD CONSTRAINT "user_web_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
