import { getChatGPTUser } from "@/app/chatgpt-auth";
import {
  getCreator,
  getCreatorActivity,
  updateCreator,
  type CreatorInput,
} from "@/app/api/_lib/creator-store";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

async function routeId(context: RouteContext) {
  const params = await context.params;
  return params.id;
}

async function actorFromRequest() {
  const user = await getChatGPTUser();
  return {
    name: user?.displayName || "Research Team",
    email: user?.email || "",
  };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected server error";
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const id = await routeId(context);
    const creator = await getCreator(id);
    if (!creator) {
      return Response.json({ error: "Creator not found." }, { status: 404 });
    }

    const activity = await getCreatorActivity(id);
    return Response.json({ creator, activity });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const id = await routeId(context);
    const payload = (await request.json()) as CreatorInput;
    const creator = await updateCreator(id, payload, await actorFromRequest());
    if (!creator) {
      return Response.json({ error: "Creator not found." }, { status: 404 });
    }

    const activity = await getCreatorActivity(id);
    return Response.json({ creator, activity });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
