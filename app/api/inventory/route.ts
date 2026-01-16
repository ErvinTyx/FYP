export async function GET() {
  return Response.json({
    module: "inventory",
    message: "Inventory API placeholder",
  });
}

export async function POST() {
  return Response.json({
    module: "inventory",
    message: "Create inventory item placeholder",
  });
}
