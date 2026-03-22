import "dotenv/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../src/generated/prisma/client.js";

const adapter = new PrismaLibSql({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.task.deleteMany();
  await prisma.column.deleteMany();
  await prisma.board.deleteMany();

  const board = await prisma.board.create({
    data: {
      title: "Project Board",
      columns: {
        create: [
          {
            title: "Backlog",
            position: 0,
            tasks: {
              create: [
                {
                  title: "Research competitors",
                  description:
                    "Analyze top 5 competitor products and document findings",
                  priority: "LOW",
                  position: 0,
                },
                {
                  title: "Define MVP features",
                  description:
                    "Create a prioritized list of must-have features for launch",
                  priority: "HIGH",
                  position: 1,
                },
              ],
            },
          },
          {
            title: "To Do",
            position: 1,
            tasks: {
              create: [
                {
                  title: "Design database schema",
                  description:
                    "Create ER diagram and define all table relationships",
                  priority: "HIGH",
                  position: 0,
                },
                {
                  title: "Set up CI/CD pipeline",
                  description:
                    "Configure GitHub Actions for automated testing and deployment",
                  priority: "MEDIUM",
                  position: 1,
                },
                {
                  title: "Write API documentation",
                  description:
                    "Document all REST endpoints with request/response examples",
                  priority: "LOW",
                  position: 2,
                },
              ],
            },
          },
          {
            title: "In Progress",
            position: 2,
            tasks: {
              create: [
                {
                  title: "Build authentication flow",
                  description:
                    "Implement login, signup, and password reset with JWT tokens",
                  priority: "HIGH",
                  position: 0,
                },
                {
                  title: "Create landing page",
                  description:
                    "Design and implement the marketing landing page with hero section",
                  priority: "MEDIUM",
                  position: 1,
                },
              ],
            },
          },
          {
            title: "Done",
            position: 3,
            tasks: {
              create: [
                {
                  title: "Project kickoff meeting",
                  description:
                    "Align team on goals, timeline, and responsibilities",
                  priority: "MEDIUM",
                  position: 0,
                },
              ],
            },
          },
        ],
      },
    },
  });

  console.log(`Created board: ${board.title} (${board.id})`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
