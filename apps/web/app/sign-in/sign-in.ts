"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { resolveReturnTo } from "./return-to";

export async function signIn(formData: FormData) {
  const callbackURL = resolveReturnTo(formData.get("returnTo"), (await auth.$context).baseURL);

  const { url } = await auth.api.signInSocial({
    headers: await headers(),
    body: {
      provider: "keycloak",
      callbackURL,
      errorCallbackURL: "/sign-in",
    },
  });

  if (!url) throw new Error("Sign-in could not start");

  redirect(url);
}
