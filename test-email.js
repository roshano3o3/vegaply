const fs = require("fs");
const nodemailer = require("nodemailer");

function readEnvValue(key) {
  const envText = fs.readFileSync(".env.local", "utf8");
  const line = envText
    .split(/\r?\n/)
    .find((row) => row.trim().startsWith(`${key}=`));

  if (!line) return undefined;

  return line.split("=").slice(1).join("=").trim();
}

async function main() {
  const emailUser = readEnvValue("EMAIL_USER");
  const emailPass = readEnvValue("EMAIL_PASS");

  if (!emailUser || !emailPass) {
    throw new Error("EMAIL_USER or EMAIL_PASS missing from .env.local");
  }

  console.log("EMAIL_USER loaded:", emailUser);
  console.log("EMAIL_PASS length:", emailPass.length);

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });

  await transporter.verify();
  console.log("Gmail SMTP login success ✅");
}

main().catch((err) => {
  console.error("Gmail SMTP login failed ❌");
  console.error(err.message);
});