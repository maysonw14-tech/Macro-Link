import "dotenv/config";
import { refreshMacroData } from "../lib/macro/refresh";
import { prisma } from "../lib/db";

async function main() {
  const r = await refreshMacroData();
  console.log("Macro refresh OK:", r);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
