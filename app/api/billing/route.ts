export async function GET() {
  return Response.json({
    module: "billing",
    message: "Billing API placeholder",
  });
}

export async function POST() {
  return Response.json({
    module: "billing",
    message: "Create invoice placeholder",
  });
}
