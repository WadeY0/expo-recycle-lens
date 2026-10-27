CREATE TYPE "ConversationType" AS ENUM ('vision', 'chat');

CREATE TABLE "conversations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL DEFAULT 'Cuộc trò chuyện',
    "conversationId" TEXT NOT NULL,
    "type" "ConversationType" NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "conversations_conversationId_key" ON "conversations"("conversationId");
CREATE UNIQUE INDEX "conversations_userId_type_key" ON "conversations"("userId", "type");

ALTER TABLE "conversations"
ADD CONSTRAINT "conversations_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
