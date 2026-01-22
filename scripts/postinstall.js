
// #!/usr/bin/env node

/**
 * Cross-platform postinstall script
 * Handles Prisma generate gracefully on Windows where DLL files can be locked
 */

const { execSync } = require("child_process");

function runCommand(command, description) {
  try {
    console.log(`\n📦 ${description}...`);
    execSync(command, { stdio: "inherit" });
    console.log(`✅ ${description} completed successfully\n`);
    return true;
  } catch (error) {
    console.error(`\n⚠️  ${description} failed:`);
    console.error(`   ${error.message}\n`);
    return false;
  }
}

// Run Prisma generate (non-blocking)
const prismaSuccess = runCommand(
  "npx prisma generate",
  "Generating Prisma Client"
);

if (!prismaSuccess) {
  console.log(
    "💡 Tip: If Prisma generate failed due to file locks on Windows,"
  );
  console.log(
    '   try running "npm run prisma:generate" manually after installation.\n'
  );
}

// Always run copy:lucide (this should always succeed)
const lucideSuccess = runCommand("npm run copy:lucide", "Copying Lucide icons");

// Exit with success (don't fail the entire install)
process.exit(0);
