import { NextResponse } from "next/server";

export function proxy(request) {
  const configuredUser = process.env.DASHBOARD_USER;
  const configuredPassword = process.env.DASHBOARD_PASSWORD;

  if (!configuredUser || !configuredPassword) {
    return new Response("Dashboard authentication is not configured.", {
      status: 503,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }

  const credentials = readBasicCredentials(request.headers.get("authorization"));
  const isAuthenticated =
    credentials &&
    secureCompare(credentials.username, configuredUser) &&
    secureCompare(credentials.password, configuredPassword);

  if (!isAuthenticated) {
    return new Response("Authentication required.", {
      status: 401,
      headers: {
        "Cache-Control": "no-store",
        "WWW-Authenticate": 'Basic realm="CFA Applications Dashboard", charset="UTF-8"',
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};

function readBasicCredentials(header) {
  if (!header?.startsWith("Basic ")) return null;

  try {
    const decoded = decodeBase64Utf8(header.slice(6));
    const separatorIndex = decoded.indexOf(":");
    if (separatorIndex === -1) return null;

    return {
      username: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1),
    };
  } catch {
    return null;
  }
}

function decodeBase64Utf8(value) {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function secureCompare(left, right) {
  const leftValue = String(left);
  const rightValue = String(right);
  let difference = leftValue.length ^ rightValue.length;
  const maxLength = Math.max(leftValue.length, rightValue.length);

  for (let index = 0; index < maxLength; index += 1) {
    difference |= leftValue.charCodeAt(index) ^ rightValue.charCodeAt(index);
  }

  return difference === 0;
}
