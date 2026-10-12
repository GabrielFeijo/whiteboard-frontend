/** Healthcheck do container (usado pelo Docker/K8s). */
export function GET() {
  return Response.json({ status: "ok" });
}
