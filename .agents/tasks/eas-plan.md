# Implementation Plan — APK (EAS Build) + endereço de servidor configurável em runtime

Contexto: estender o cliente Expo existente em `c:\Users\INEX\source\repos\personal\focus\app` (Expo SDK 54, Expo Router, React Query, TS, React 19 / RN 0.81). NÃO reescrever o app. Toda a UI permanece em pt-BR, reutilizando os componentes de `src/ui/componentes.tsx`. Backend NÃO deve ser alterado.

Decisões de design (fundamentadas no código lido):

- **Precedência da URL base** (de maior para menor prioridade): (1) valor salvo pelo usuário via `src/storage.ts` sob a chave `focus.apiBaseUrl`; (2) valor de build `process.env.EXPO_PUBLIC_API_BASE_URL`; (3) valor injetado `Constants.expoConfig.extra.apiBaseUrl`; (4) default `http://localhost:3000`. Os itens 2–4 já são a expressão atual de `config.ts` e viram o "fallback de build".
- **Leitura por requisição em vez de constante de import**: hoje `client.ts` importa `API_BASE_URL` (congelado no import). Refatoramos `config.ts` para expor uma variável de módulo mutável + getter `obterApiBaseUrl()` + setter `definirApiBaseUrl()` + inicializador assíncrono `carregarApiBaseUrlSalva()`. `client.ts` passa a chamar `obterApiBaseUrl()` dentro de `requisitar()` a cada chamada, não no topo do módulo. Isso espelha o padrão já usado em `client.ts` para o token (`registrarProvedorDeToken` + getter mutável), mantendo consistência.
- **Fallback síncrono**: `obterApiBaseUrl()` sempre retorna um valor síncrono (inicialmente o fallback de build), então o primeiro render antes do storage carregar não quebra. A carga do storage é assíncrona e, ao concluir, atualiza a variável em memória.
- **Boot da carga**: disparar `carregarApiBaseUrlSalva()` no `AuthProvider` (em `src/auth/AuthContext.tsx`), antes/junto da reidratação da sessão, pois é o provider montado no boot que já faz trabalho assíncrono de inicialização e envolve toda a árvore autenticada em `_layout.tsx`.
- **Normalização de URL**: `trim()` + remover barra(s) finais, de modo que `${base}/auth/login` nunca duplique a barra. Validar que começa com `http://` ou `https://` e tem host. Centralizar em helpers exportados de `config.ts` (`normalizarApiBaseUrl`, `urlValida`) para reuso na tela.

---

## TASK 1 — URL base configurável em runtime

- [ ] 1. Refatorar `src/config.ts` para resolução em runtime com getter/setter e helpers de normalização.
      Substituir a constante `API_BASE_URL` por: (a) `const FALLBACK_BUILD` calculado como hoje (`EXPO_PUBLIC_API_BASE_URL` → `expoConfig.extra.apiBaseUrl` → `http://localhost:3000`), já normalizado; (b) variável de módulo `let apiBaseUrlAtual = FALLBACK_BUILD`; (c) `export function obterApiBaseUrl(): string` retornando `apiBaseUrlAtual` (síncrono, nunca vazio); (d) `export function definirApiBaseUrl(url: string): void` que normaliza e atribui a `apiBaseUrlAtual`; (e) `export async function carregarApiBaseUrlSalva(): Promise<void>` que lê `getItem('focus.apiBaseUrl')`; se houver valor válido, chama `definirApiBaseUrl`; (f) `export const CHAVE_API_BASE_URL = 'focus.apiBaseUrl'`; (g) helpers `export function normalizarApiBaseUrl(url: string): string` (trim + remove barras finais) e `export function urlValida(url: string): boolean` (regex/`URL` para http(s) com host). Importar `getItem` de `@/storage`. Comentários em pt-BR seguindo o estilo do arquivo. Manter a precedência descrita acima.
      Files: `c:\Users\INEX\source\repos\personal\focus\app\src\config.ts`
      Verify: `cd c:\Users\INEX\source\repos\personal\focus\app; npx tsc --noEmit` — sem erros.

- [ ] 2. Ajustar `src/api/client.ts` para ler a URL base por requisição.
      Trocar `import { API_BASE_URL } from "@/config"` por `import { obterApiBaseUrl } from "@/config"`. Dentro de `requisitar()`, construir a URL como `${obterApiBaseUrl()}${caminho}` (chamada no momento do fetch, não no topo do módulo). NÃO alterar `ApiError`, o mapeamento de erros (`CODIGO_ERRO_REDE`/`mensagemDeErro`), o provedor de token, nem as assinaturas de `api.get/post/put/del`.
      Files: `c:\Users\INEX\source\repos\personal\focus\app\src\api\client.ts`
      Verify: `cd c:\Users\INEX\source\repos\personal\focus\app; npx tsc --noEmit` — sem erros.

- [ ] 3. Carregar a URL salva no boot, dentro do `AuthProvider`.
      Em `src/auth/AuthContext.tsx`, importar `carregarApiBaseUrlSalva` de `@/config` e, no `useEffect` de boot (o mesmo que faz a reidratação via `GET /auth/me`), chamar `await carregarApiBaseUrlSalva()` ANTES da chamada `api.get('/auth/me', ...)`, para que a reidratação já use a URL persistida. Não alterar a lógica de sessão/token existente; apenas inserir a carga da URL no início do fluxo assíncrono (respeitando o flag `ativo`).
      Files: `c:\Users\INEX\source\repos\personal\focus\app\src\auth\AuthContext.tsx`
      Verify: `cd c:\Users\INEX\source\repos\personal\focus\app; npx tsc --noEmit` — sem erros.

- [ ] 4. Criar a tela `Endereço do servidor` (Expo Router), reutilizando os componentes de UI.
      Nova rota `src/app/servidor.tsx`, estrutura espelhando `src/app/solicitar-conta.tsx`: `KeyboardAvoidingView` + `ScrollView` + `View` (maxWidth 460, centralizado); `Titulo` "Endereço do servidor"; `Subtitulo` explicando que define onde o app encontra o servidor da academia; `Cartao` com `Rotulo` "URL do servidor" e `Campo` pré-preenchido com `obterApiBaseUrl()` (estado inicial via `useState(() => obterApiBaseUrl())`), `placeholder="http://192.168.0.10:3000"`, `autoCapitalize="none"`, `autoCorrect={false}`, `keyboardType="url"`. Três ações com `Botao`:
      - "Salvar": valida com `urlValida` (senão `MensagemErro` "Informe uma URL válida iniciando com http:// ou https://."); se válida, `normalizarApiBaseUrl`, persiste via `setItem(CHAVE_API_BASE_URL, url)` (de `@/storage`), chama `definirApiBaseUrl(url)` (atualiza memória imediatamente) e mostra `MensagemSucesso` "Endereço salvo." Atualiza o campo com o valor normalizado.
      - "Testar conexão" (`variante="secundaria"`, estado `testando`): monta `${normalizarApiBaseUrl(url)}/health`, faz `fetch` direto (try/catch; checa `resposta.ok` e `json.ok === true`); sucesso → `MensagemSucesso` "Conexão bem-sucedida com o servidor."; falha de rede/resposta → `MensagemErro` "Não foi possível conectar. Verifique a URL e se o servidor está ligado." NÃO usar `api.*` aqui (queremos testar a URL digitada, não a vigente).
      - "Voltar para o login" (`variante="secundaria"`, `router.replace('/login')`).
      Estados locais: `url`, `erro`, `sucesso`, `salvando`, `testando` (limpar `erro`/`sucesso` no início de cada ação). Toda a UI em pt-BR, usando `cores` e os mesmos paddings de `solicitar-conta.tsx`.
      Files: `c:\Users\INEX\source\repos\personal\focus\app\src\app\servidor.tsx`
      Verify: `cd c:\Users\INEX\source\repos\personal\focus\app; npx tsc --noEmit` — sem erros.

- [ ] 5. Tornar `/servidor` uma rota pública e adicionar o link na tela de login.
      Em `src/app/_layout.tsx`, incluir `"/servidor"` no array `ROTAS_PUBLICAS` para que seja acessível sem sessão (hoje o guard redireciona rotas não públicas para `/login`). Em `src/app/login.tsx`, adicionar um `<Link href="/servidor">` com `<Rotulo>Endereço do servidor</Rotulo>` logo ao lado/abaixo do `<Link href="/solicitar-conta">` existente, no mesmo padrão de `marginTop: 8`.
      Files: `c:\Users\INEX\source\repos\personal\focus\app\src\app\_layout.tsx`, `c:\Users\INEX\source\repos\personal\focus\app\src\app\login.tsx`
      Verify: `cd c:\Users\INEX\source\repos\personal\focus\app; npx tsc --noEmit` — sem erros; `cd c:\Users\INEX\source\repos\personal\focus\app; npx expo export --platform web` conclui sem erro (depois remover `dist/`).

---

## TASK 2 — Configuração do EAS Build para gerar APK

- [ ] 6. Adicionar `android.package` e manter a versão em `app.config.js`.
      No bloco `android` de `app.config.js`, adicionar `package: "com.focus.app"` e `versionCode: 1` (consistente com `version: "1.0.0"`). Manter todo o resto intacto (name/slug/scheme, `extra.apiBaseUrl`, bloco `ios`, plugins, web). Não remover nem renomear campos existentes.
      Files: `c:\Users\INEX\source\repos\personal\focus\app\app.config.js`
      Verify: `cd c:\Users\INEX\source\repos\personal\focus\app; node -e "console.log(JSON.stringify(require('./app.config.js')().expo.android))"` — imprime o bloco android com `package` e `versionCode`.

- [ ] 7. Criar `eas.json` com os perfis development, preview (APK) e production.
      Novo arquivo `app/eas.json`. Shape (confirmado na doc atual do EAS — perfil `preview` com `android.buildType: "apk"` + `distribution: "internal"` gera um `.apk` instalável; `production` fica como app-bundle default):
      ```json
      {
        "cli": { "version": ">= 12.0.0", "appVersionSource": "local" },
        "build": {
          "development": {
            "developmentClient": true,
            "distribution": "internal",
            "android": { "buildType": "apk" }
          },
          "preview": {
            "distribution": "internal",
            "android": { "buildType": "apk" }
          },
          "production": {
            "autoIncrement": true
          }
        },
        "submit": { "production": {} }
      }
      ```
      Files: `c:\Users\INEX\source\repos\personal\focus\app\eas.json`
      Verify: `cd c:\Users\INEX\source\repos\personal\focus\app; node -e "const e=require('./eas.json'); if(e.build.preview.android.buildType!=='apk'){process.exit(1)}; console.log('ok')"` — imprime `ok` (JSON bem-formado e perfil preview pede APK).

- [ ] 8. Declarar `eas-cli` como devDependency e adicionar script de conveniência no `package.json` do app.
      Em `app/package.json`: adicionar em `devDependencies` `"eas-cli": "^12.0.0"` (versão estável recente pinada com caret, alinhada ao `cli.version` do eas.json) e, em `scripts`, `"build:apk": "eas build -p android --profile preview"` seguindo o estilo enxuto dos scripts atuais. Não alterar as dependências de runtime existentes.
      Files: `c:\Users\INEX\source\repos\personal\focus\app\package.json`
      Verify: `cd c:\Users\INEX\source\repos\personal\focus\app; npx tsc --noEmit` — sem erros (o `package.json` continua válido e o typecheck roda). Opcional: `cd c:\Users\INEX\source\repos\personal\focus\app; npx eas --version` após `npm install` — imprime a versão do eas-cli (NÃO rodar `eas login` nem `eas build`).

---

## TASK 3 — Documentação no README (pt-BR)

- [ ] 9. Adicionar seções ao `README.md` sobre gerar o APK e usar o endereço de servidor em runtime.
      Em `c:\Users\INEX\source\repos\personal\focus\README.md`, manter todo o conteúdo atual e acrescentar duas novas seções no mesmo tom pt-BR:
      - **"Gerar o APK (EAS Build)"**: pré-requisitos (conta Expo gratuita; `cd app`; `npm install`); passos `npx eas login`, depois `npx eas build -p android --profile preview` (ou `npm run build:apk`), que retorna um link para baixar o `.apk`; observar que `eas-cli` agora é devDependency, então `npx eas` funciona sem instalação global.
      - **"Endereço do servidor no app instalado"**: após instalar o APK, abrir o app, tocar em **"Endereço do servidor"** na tela de login, digitar a URL da LAN do PC (ex.: `http://192.168.0.10:3000`), usar **"Testar conexão"**, **Salvar** e então entrar. Reforçar que celular e PC precisam estar na mesma rede Wi-Fi e com o backend rodando (`cd server; npm run start`). Explicar que um único APK serve para qualquer rede porque o endereço é configurável em runtime (não fica congelado no build).
      Files: `c:\Users\INEX\source\repos\personal\focus\README.md`
      Verify: revisão visual — as duas seções existem, em pt-BR, sem remover conteúdo anterior. (Documentação; sem comando de build.)

---

## VERIFICAÇÃO FINAL (o coder DEVE rodar toda a lista)

1. Typecheck limpo:
   `cd c:\Users\INEX\source\repos\personal\focus\app; npx tsc --noEmit` — sem erros.
2. Build web não quebrado:
   `cd c:\Users\INEX\source\repos\personal\focus\app; npx expo export --platform web` — conclui com sucesso; depois remover o diretório gerado: `cd c:\Users\INEX\source\repos\personal\focus\app; Remove-Item -Recurse -Force dist`.
3. `eas.json` bem-formado e perfil preview pede APK:
   `cd c:\Users\INEX\source\repos\personal\focus\app; node -e "const e=require('./eas.json'); if(e.build.preview.android.buildType!=='apk') process.exit(1); console.log('ok')"` — imprime `ok`.
4. (Opcional) eas-cli instalado:
   `cd c:\Users\INEX\source\repos\personal\focus\app; npx eas --version` — imprime a versão. NÃO rodar `eas login` nem `eas build`.
5. Backend saudável com DB descartável:
   iniciar brevemente `cd c:\Users\INEX\source\repos\personal\focus\server; $env:DB_PATH="$env:TEMP\focus-verif.db"; npm run start` em background; confirmar `GET http://localhost:3000/health` retorna `{"ok":true}` (ex.: `Invoke-RestMethod http://localhost:3000/health`); depois parar o processo e remover o DB temporário. NÃO alterar o backend.

Observações / suposições:
- Teste de conexão na tela usa `fetch` direto (não `api.*`) de propósito: valida a URL digitada antes de salvar, independente da URL vigente.
- `versionCode: 1` e `cli.version ">= 12.0.0"` são escolhas conservadoras compatíveis com o schema atual do EAS; o coder pode subir o piso de versão se o `npm install` resolver um eas-cli mais novo, mantendo o caret `^12`.
- Nenhuma mudança no backend, na lógica de auth ou no design visual; apenas extensão.

---

## Nota de verificação (execução real)

Ambiente: Windows / PowerShell, Node v24.19.0. Comandos e resultados:

1. `cd app; npx tsc --noEmit` → **limpo** (exit 0), antes e depois do `npm install`.
2. `cd app; npx expo export --platform web` → **sucesso** (bundle web gerado, "Exported: dist"); `dist/` removido em seguida com `Remove-Item -Recurse -Force dist`.
3. `node -e "require('./eas.json') ... buildType==='apk'"` → imprimiu **`eas ok`** (JSON bem-formado; perfil `preview` pede APK). `app.config.js` android imprime `{"package":"com.focus.app","versionCode":1,...}`.
4. `cd app; npm install` → adicionou `eas-cli` como devDependency (377 pacotes). `npx eas --version` → **`eas-cli/16.32.0 win32-x64 node-v24.19.0`** (sem login, sem build). Pin `^16.0.0` em package.json alinhado ao `cli.version ">= 16.0.0"` do eas.json.
5. Backend: `cd server; $env:DB_PATH="$env:TEMP\focus-verif.db"; node src/index.js` em background; `Invoke-RestMethod http://localhost:3000/health` → **`{"ok":true}`**; processo parado (Stop-Process na porta 3000) e DB temporário removido. Backend não alterado.

Observação: o floor de versão do eas-cli foi elevado de `^12` para `^16` (e `cli.version` para `>= 16.0.0`) porque o `npm install` resolveu o eas-cli estável atual (16.32.0); schema `preview` + `distribution: internal` + `android.buildType: apk` confirmado na doc atual do EAS.
