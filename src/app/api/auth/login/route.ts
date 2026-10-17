import { login } from "@/app/actions/auth";
import { assertOrigin, boundedFormData, errorResponse } from "@/lib/security";
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const result = await login(await boundedFormData(request, 16 * 1024));
    return Response.json(result, {
      status: result.success ? 200 : 401,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
