export async function requireAdmin(request, reply) {
  if (!process.env.ADMIN_API_KEY || request.headers["x-admin-key"] !== process.env.ADMIN_API_KEY) {
    return reply.code(401).send({ error: "Admin API key required." });
  }
}
