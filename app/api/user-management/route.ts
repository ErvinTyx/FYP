export async function GET() {
  return Response.json({
    module: "user-management",
    message: "User management API placeholder",
  });
}

export async function POST() {
  return Response.json({
    module: "user-management",
    message: "Create user placeholder",
  });
}
