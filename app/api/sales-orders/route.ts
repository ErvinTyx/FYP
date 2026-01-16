export async function GET() {
  return Response.json({
    module: "sales-orders",
    message: "Sales orders API placeholder",
  });
}

export async function POST() {
  return Response.json({
    module: "sales-orders",
    message: "Create sales order placeholder",
  });
}
