
require("dotenv").config();

const bcrypt = require("bcryptjs");
const prisma = require("./src/utils/prisma");

async function main() {
  const email = "testuser@example.com";
  const newPassword = "TestPass123!";

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error(`No account found for ${email}`);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { email },
    data: { passwordHash: hashedPassword },
  });

  console.log("Test account password reset successfully.");
  console.log(`Email: ${email}`);
  console.log("Password: TestPass123!");
}

main()
  .catch((error) => {
    console.error("Password reset failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
