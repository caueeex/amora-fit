import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/minha-conta", "/admin", "/checkout"];
const GUEST_ONLY = ["/entrar", "/cadastro"];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Renova a sessão do Supabase a cada requisição e barra visitantes sem login
 * nas rotas privadas. Esta é só a PRIMEIRA camada: a verificação de papel
 * (admin) é feita no servidor em cada layout/action, e o banco aplica RLS.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Sem Supabase configurado (ex.: primeiro clone), não bloqueia o desenvolvimento.
  if (!url || !key) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        // Evita que uma CDN armazene respostas com cookies de sessão.
        for (const [k, v] of Object.entries(headers ?? {})) response.headers.set(k, v);
      },
    },
  });

  // Não colocar código entre createServerClient e getClaims: getClaims valida
  // o JWT e dispara a renovação do token quando necessário.
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  // Quem já está logado não precisa ver login/cadastro.
  if (userId && GUEST_ONLY.includes(request.nextUrl.pathname)) {
    const accountUrl = request.nextUrl.clone();
    accountUrl.pathname = "/minha-conta";
    accountUrl.search = "";
    const redirect = NextResponse.redirect(accountUrl);
    for (const c of response.cookies.getAll()) redirect.cookies.set(c);
    return redirect;
  }

  if (!userId && isProtected(request.nextUrl.pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/entrar";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    const redirect = NextResponse.redirect(loginUrl);
    for (const c of response.cookies.getAll()) redirect.cookies.set(c);
    return redirect;
  }

  return response;
}
