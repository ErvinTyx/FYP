export async function GET() {
  return Response.json({
    module: "content",
    message: "Content API placeholder",
  });
}

export async function POST() {
  return Response.json({
    module: "content",
    message: "Create content placeholder",
  });
}
