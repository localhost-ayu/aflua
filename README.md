# aflua

[English](#english) · [Português do Brasil](#portugues) · [License / Licença](#license)

Source-available · Free for noncommercial use · Commercial use requires a separate written agreement

<a id="english"></a>

**A personal cash-flow tracker built with Laravel and React.** Aflua helps people record income and expenses, manage monthly recurrences, and compare their realized balance with what is still expected for the month. This portfolio project began as Expense Tracker, gained a bilingual and more considered interface under the name cifra, and now evolves into aflua: a product identity inspired by the movement of money in and out.

The `expense-tracker-api` and `expense-tracker-frontend` directories retain their original technical names. The repository name can change independently of these paths; the application itself is branded aflua.

## Product evolution

The first version established the full-stack foundation: Sanctum authentication, protected REST endpoints, expense CRUD, category and date filters, and aggregated dashboard charts. The cifra iteration focused on product design and frontend experience. The current aflua iteration builds on that foundation with independent category catalogs, a unified income/expense form, monthly recurrences, and a cash-flow dashboard that distinguishes recorded money from projected money.

| Area | Evolution |
| --- | --- |
| Identity | An aflua wordmark and flowing `a` favicon, river-green and warm neutral palette, humanist serif headings, and restrained visual details. |
| Categories | Default categories are cloned on registration and belong to each user; names and colors can be customized without affecting other accounts. |
| Cash flow | Income and expense entries share one modal; the dashboard compares realized and projected balances with visible pending amounts. |
| Recurrences | Monthly rules create an initial confirmed entry, support editable confirmation and automatic processing, and preserve the history of completed cycles. |
| Themes | Light mode and a warm graphite dark mode, with the preference saved locally. |
| Language | Complete interface text in Brazilian Portuguese and English, including dates, month names, currency formatting, filters, forms, and charts. |
| Feedback | Loading skeletons, consistent success/error toasts, subtle modal and state transitions, and reduced-motion support. |
| Usability | Keyboard-accessible transaction modal with Escape handling and focus management; compact category/recurrence panels; period-aware links from the dashboard to pending entries; stale responses cannot replace newer results. |

This evolution demonstrates how an existing application can gain a stronger product identity and safer data ownership without a rewrite.

The visual system replaces the original violet, card-heavy UI with a warmer and quieter approach: Fraunces headings, DM Sans body text, paper-like surfaces, a river-green brand color, and a graphite dark theme.

## Interface gallery

| Area | Light theme | Dark theme |
| --- | --- | --- |
| Dashboard | <img src="./Screenshots/dashboard_light.png" alt="Aflua dashboard and spending charts in the light theme" width="420"> | <img src="./Screenshots/dashboard_dark.png" alt="Aflua dashboard and spending charts in the dark theme" width="420"> |
| Expenses | <img src="./Screenshots/expenses_light.png" alt="Aflua expense filters and list in the light theme" width="420"> | <img src="./Screenshots/expenses_dark.png" alt="Aflua expense filters and list in the dark theme" width="420"> |
| Add expense | <img src="./Screenshots/addexpense_light.png" alt="Aflua new-expense modal in the light theme" width="420"> | <img src="./Screenshots/addexpense_dark.png" alt="Aflua new-expense modal in the dark theme" width="420"> |

## Features

### Authentication

- User registration and login
- Laravel Sanctum token authentication
- Protected frontend routes and authenticated API endpoints

### Transaction management

- Create, edit, and delete income and expenses through the same modal
- Toggle between expense and income; categories apply only to expenses
- Record one-off income such as bonuses without repeating it in subsequent months
- Filter transactions by type, category, month, and year
- Category colors stay consistent between expense tags and dashboard charts

### Monthly recurrences

- Enable monthly repetition inside the transaction modal and set a day of the month
- Saving a new recurrence also confirms the first entry without creating a duplicate
- Short months use the last available day when the configured day does not exist
- Confirm pending entries with an editable amount, skip a month, or reopen it
- Adjust confirmed amounts or undo confirmation without silently auto-confirming the same cycle again
- Activate/deactivate rules without deleting confirmed history
- Delete a rule while keeping linked entries as one-offs, or delete the rule and its linked entries
- When deleting a recurring entry, choose whether to leave the month pending or skip that month
- Automatic confirmation runs through Laravel's scheduler; it does not happen inside a dashboard GET

### Categories

- Default categories cloned into every new account
- User-owned category CRUD with authorization checks
- Editable names and hex colors, used consistently in expense tags and dashboard charts
- Existing expenses preserved when legacy global categories are migrated to individual catalogs
- Deletion of a category with linked expenses or recurring rules is blocked until those links are resolved

### Dashboard analytics

- Received, spent, realized balance, and projected balance for the selected month
- Visible pending income and expense totals, with expandable transaction details
- A direct link to review recurrences in the selected month
- Expense distribution by category
- Income and expense history for six consecutive months ending in the selected period, including months with no activity
- Month and year filters
- Interactive Recharts pie and grouped bar charts, with a screen-reader-readable history table
- Raw month/year data from the API; period labels, dates, and money are formatted in the frontend

### Interface

- Responsive layout with light and dark themes
- PT-BR and EN language switcher
- Local persistence of language and theme preferences
- Skeleton loading states, operation feedback, and subtle transitions

## Tech stack

| Layer | Technologies |
| --- | --- |
| Frontend | React 19, Vite, React Router, Axios, Context API, Recharts |
| Backend | Laravel 13, Laravel Sanctum, REST API, authorization policies |
| Database | MySQL |

## Project structure

```text
repository-root/
├── expense-tracker-api/
│   ├── app/
│   │   ├── Http/Controllers/       # Auth, categories, transactions, recurrences, dashboard
│   │   ├── Models/                 # User, Category, Expense, Income, recurring rules/occurrences
│   │   ├── Policies/               # Ownership authorization
│   │   └── Services/               # Recurrence preparation, confirmation, and deletion
│   ├── database/
│   │   ├── migrations/
│   │   └── seeders/
│   └── routes/api.php
├── expense-tracker-frontend/
│   └── src/
│       ├── api/                    # Axios client and token interceptor
│       ├── components/charts/      # Category and monthly cash-flow charts
│       ├── components/ui/          # Navigation, language, protected route, pending cash flow
│       ├── contexts/               # Authentication and theme
│       ├── hooks/                  # Fetching, dashboard preparation, and form errors
│       ├── i18n/                   # PT-BR / EN translations and formatting
│       └── pages/                  # Auth, dashboard, transactions, unified modal
└── Screenshots/                   # Aflua light and dark UI captures
```

## Architecture

The React single-page application calls the Laravel REST API through Axios. The client attaches a Sanctum bearer token to authenticated requests. Laravel validates requests, scopes categories, transactions, and recurring rules to the authenticated user, applies authorization policies, and reads or writes MySQL data. Recurrence confirmation creates the real transaction and links it to its occurrence in one database transaction. The dashboard endpoint returns aggregates and pending entries for the frontend.

```text
React 19 + Router + Context API + Recharts
                  │ HTTP / JSON
                  ▼
Laravel 13 REST API + Sanctum + Policies
                  │
                  ▼
                MySQL
```

### Data relationships

- A `User` has many `Category`, `Expense`, `Income`, and `RecurringRule` records.
- A `Category` belongs to a user and can be used by expenses and expense recurrence rules.
- An `Expense` belongs to a user and a category.
- An `Income` belongs to a user and does not require a category.
- A `RecurringRule` belongs to a user and has monthly `RecurringOccurrence` records.
- Each occurrence is pending, confirmed, or skipped; a confirmed occurrence links to an expense or income.
- A unique rule/year/month constraint prevents duplicate monthly occurrences.

Registration creates the user and their default category catalog in one transaction. The ownership migration clones legacy global categories per existing account and remaps historical expenses to the correct copies.

### Dashboard queries

The dashboard uses sums, category grouping, and date-based filtering scoped to the authenticated user. Balance arithmetic uses integer cents. The selected period returns both balances:

```text
realized balance  = recorded income − recorded expenses
projected balance = realized balance + pending income − pending expenses
```

Pending occurrences of active, valid rules contribute to the projection. Confirmed and skipped occurrences do not; paused or expired rules do not add expected money. Pending values follow the current rule amount, while confirmed values come from the historical transaction.

The frontend first calls `POST /api/recurring-occurrences/prepare` with the selected month/year, then calls `GET /api/dashboard`. Preparation is idempotent and separate from reading; the dashboard GET does not generate or confirm occurrences. API consumers should use the same sequence before reading a period that has not been prepared yet.

The response retains `total_this_month`, `total_income`, `net_balance`, `by_category`, and `last_six_months`, and adds:

| Field | Meaning |
| --- | --- |
| `month`, `year` | Selected period as numbers. |
| `realized_balance` | Recorded income minus recorded expenses; also returned as `net_balance`. |
| `projected_balance` | Realized balance plus pending income minus pending expenses. |
| `pending_income`, `pending_expense` | Separate expected totals. |
| `pending_incomes`, `pending_expenses` | Separate lists with description, amount, effective date, and category where applicable. |

Each `last_six_months` item contains numeric `month`/`year`, `total_income`, `total_expenses`, and `realized_balance`. The previous `total` expense value is retained; the old localized `label` is replaced by frontend formatting. The six-month window now follows the selected period instead of the current date.

## Engineering concepts

Full-stack development · REST API design · SPA authentication with Sanctum · React Context API · protected routes · custom hooks · CRUD · SQL aggregation · authorization policies · transactional recurrence confirmation · idempotency · cash-flow projections · component-based UI · data visualization · internationalization · accessible interaction states.

## Run locally

### Backend

From the repository root:

```bash
cd expense-tracker-api
composer install
cp .env.example .env
```

Configure the MySQL connection in `expense-tracker-api/.env`, then run:

```bash
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

The API runs at `http://localhost:8000` by default.

For automatic monthly confirmation, keep Laravel's scheduler running in a separate terminal during local development:

```bash
php artisan schedule:work
```

The recurrence processor is scheduled daily at 00:10 in the application's timezone. To process due occurrences once manually:

```bash
php artisan recurrences:process
```

Without the scheduler, pending occurrences can still be prepared and confirmed manually through the interface. Future months can be inspected without confirming their projected entries.

### Frontend

In a second terminal, from the repository root:

```bash
cd expense-tracker-frontend
npm install
npm run dev
```

The Axios client currently points to `http://localhost:8000/api`.

### Verification

```bash
# In expense-tracker-api (tests use isolated in-memory SQLite)
php artisan test

# In expense-tracker-frontend
npm run lint
npm run build
```

For a manual cash-flow check, record December salary of R$ 5,000, rent of R$ 1,800, a one-off bonus of R$ 5,000, and other expenses of R$ 600. December should show R$ 10,000 received, R$ 2,400 spent, and R$ 7,600 realized. In January, the bonus must not repeat; pending rent contributes to projected expenses without reducing the realized balance until confirmed.

## Next steps

- Budget planning, financial goals, and report exports
- Pagination and server-side filtering for larger transaction histories
- Route-level code splitting to reduce the frontend bundle
- Environment-based API configuration
- Broader automated coverage for transaction and recurrence flows
- Query/index profiling and database-side aggregation for larger cash-flow histories

## About

Built as a portfolio project to practice Laravel, React, Sanctum authentication, REST APIs, data visualization, and full-stack application architecture. The source code uses English identifiers; the product interface supports Brazilian Portuguese and English.

## License

Original aflua code is available under the [PolyForm Noncommercial License 1.0.0](./LICENSE). This is a **source-available project**, not an OSI-approved open source project, because commercial use is not granted by this license.

- **Personal and noncommercial use:** you may use, modify, and share the code for purposes permitted by the license, including personal finance tracking, study, and noncommercial experimentation.
- **Attribution:** when sharing original or modified code, include the license text or its official URL and preserve the `Required Notice:` lines in [NOTICE](./NOTICE), crediting Nathã Grazzioli Botelho and the original aflua repository. The license grants permission to modify the code, not to remove its required attribution.
- **Commercial use:** paid apps, subscription services, monetized adaptations, or other commercial uses outside the license's permitted purposes require a separate commercial license and the author's **prior written authorization**. Financial terms, including the author's remuneration, must be negotiated and agreed before commercial use begins. Merely giving credit or sending a request does not grant commercial permission.
- **Contact:** [open a GitHub issue](https://github.com/localhost-ayu/aflua/issues) describing the intended use and requesting a commercial licensing discussion. No personal email address is published here.
- **Third-party software:** dependencies and framework/template code retain their own licenses. These project terms do not relicense third-party material or revoke rights previously granted under another license.

The English text in [LICENSE](./LICENSE) is the license; the explanations in this README, in either language, are summaries. The software is provided without warranty, as stated in the license. Any future official hosted service may have its own terms of use; using that service does not automatically grant a commercial license to this source code.

<a id="portugues"></a>

<details>
<summary><strong>Português do Brasil — documentação completa</strong></summary>

## aflua — Português do Brasil

**Um organizador de fluxo de caixa pessoal desenvolvido com Laravel e React.** O aflua ajuda a registrar ganhos e despesas, gerenciar recorrências mensais e comparar o saldo realizado com o que ainda está previsto para o mês. Este projeto de portfólio começou como Expense Tracker, ganhou uma interface bilíngue e mais cuidadosa sob o nome cifra e evoluiu para aflua: uma identidade inspirada no movimento de entrada e saída do dinheiro.

Os diretórios `expense-tracker-api` e `expense-tracker-frontend` mantêm seus nomes técnicos originais. O nome do repositório pode mudar independentemente desses caminhos; a aplicação usa a marca aflua.

### Evolução do produto

A primeira versão estabeleceu a base full stack: autenticação com Sanctum, endpoints REST protegidos, CRUD de despesas, filtros por categoria e data e gráficos agregados no dashboard. A etapa cifra se concentrou no design do produto e na experiência do frontend. A versão aflua amplia essa base com catálogos de categorias independentes, formulário unificado de ganhos e despesas, recorrências mensais e um dashboard de fluxo de caixa que distingue dinheiro registrado de dinheiro previsto.

| Área | Evolução |
| --- | --- |
| Identidade | Marca aflua e favicon com um `a` fluido, verde inspirado em rios, tons neutros quentes, títulos com fonte serifada humanista e detalhes visuais discretos. |
| Categorias | As categorias padrão são clonadas no cadastro e pertencem a cada usuário; nomes e cores podem ser personalizados sem afetar outras contas. |
| Fluxo de caixa | Ganhos e despesas compartilham um modal; o dashboard compara saldos realizado e projetado e deixa os valores pendentes visíveis. |
| Recorrências | Regras mensais criam o primeiro lançamento confirmado, permitem confirmar com valor editável e processar automaticamente, preservando o histórico dos ciclos concluídos. |
| Temas | Modo claro e modo escuro em grafite quente, com preferência salva localmente. |
| Idioma | Interface completa em português brasileiro e inglês, incluindo datas, nomes dos meses, moeda, filtros, formulários e gráficos. |
| Feedback | Skeletons de carregamento, toasts consistentes de sucesso e erro, transições sutis e suporte à preferência por movimento reduzido. |
| Usabilidade | Modal de lançamento acessível por teclado, fechamento com Escape e controle de foco; painéis compactos de categorias e recorrências; links do dashboard para pendências do período correto; respostas antigas não substituem dados mais recentes. |

Essa evolução demonstra como uma aplicação existente pode ganhar uma identidade de produto mais consistente e um isolamento de dados mais seguro sem uma reescrita.

O sistema visual substitui a interface original violeta, com muitos cards, por uma abordagem mais acolhedora: títulos em Fraunces, textos em DM Sans, superfícies inspiradas em papel, verde como cor da marca e tema escuro em grafite.

### Galeria da interface

| Área | Tema claro | Tema escuro |
| --- | --- | --- |
| Dashboard | <img src="./Screenshots/dashboard_light.png" alt="Dashboard do aflua e gráficos de despesas no tema claro" width="420"> | <img src="./Screenshots/dashboard_dark.png" alt="Dashboard do aflua e gráficos de despesas no tema escuro" width="420"> |
| Despesas | <img src="./Screenshots/expenses_light.png" alt="Filtros e lista de despesas do aflua no tema claro" width="420"> | <img src="./Screenshots/expenses_dark.png" alt="Filtros e lista de despesas do aflua no tema escuro" width="420"> |
| Adicionar despesa | <img src="./Screenshots/addexpense_light.png" alt="Modal de nova despesa do aflua no tema claro" width="420"> | <img src="./Screenshots/addexpense_dark.png" alt="Modal de nova despesa do aflua no tema escuro" width="420"> |

### Funcionalidades

#### Autenticação

- Cadastro e login de usuários
- Autenticação por token com Laravel Sanctum
- Rotas protegidas no frontend e endpoints autenticados na API

#### Gerenciamento de lançamentos

- Criar, editar e excluir ganhos e despesas pelo mesmo modal
- Alternar entre despesa e ganho; categorias se aplicam apenas às despesas
- Registrar ganhos avulsos, como bônus, sem repeti-los nos meses seguintes
- Filtrar lançamentos por tipo, categoria, mês e ano
- Manter as cores das categorias consistentes entre as tags de despesas e os gráficos

#### Recorrências mensais

- Ativar a repetição mensal dentro do modal de lançamento e escolher o dia do mês
- Salvar uma nova recorrência também confirma o primeiro lançamento, sem duplicá-lo
- Meses curtos usam o último dia disponível quando o dia configurado não existe
- Confirmar pendências com valor editável, pular um mês ou reabri-lo
- Ajustar valores confirmados ou desfazer a confirmação sem reconfirmar automaticamente o mesmo ciclo
- Ativar ou desativar regras sem apagar o histórico confirmado
- Excluir uma regra mantendo os lançamentos vinculados como avulsos ou excluir a regra junto com eles
- Ao excluir um lançamento recorrente, escolher entre deixar o mês pendente ou pular esse mês
- A confirmação automática é executada pelo scheduler do Laravel; não ocorre dentro de um GET do dashboard

#### Categorias

- Categorias padrão clonadas para cada nova conta
- CRUD de categorias com dono e verificações de autorização
- Nomes e cores hexadecimais editáveis, usados de forma consistente na lista e nos gráficos
- Despesas existentes preservadas na migração de categorias globais para catálogos individuais
- Exclusão bloqueada quando a categoria tem despesas ou regras de recorrência vinculadas, até resolver esses vínculos

#### Dashboard e análise

- Recebido, gasto, saldo realizado e saldo projetado no mês selecionado
- Totais visíveis de ganhos e despesas pendentes, com detalhes expansíveis
- Link direto para revisar recorrências no mês selecionado
- Distribuição de despesas por categoria
- Histórico de ganhos e despesas dos seis meses até o período selecionado, incluindo meses sem movimentação
- Filtros de mês e ano
- Gráficos interativos de pizza e barras agrupadas com Recharts e tabela de histórico acessível a leitores de tela
- Mês e ano como dados brutos da API; rótulos dos períodos, datas e valores formatados no frontend

#### Interface

- Layout responsivo com temas claro e escuro
- Seletor de idioma PT-BR e EN
- Preferências de idioma e tema salvas localmente
- Skeletons de carregamento, feedback das operações e transições sutis

### Tecnologias

| Camada | Tecnologias |
| --- | --- |
| Frontend | React 19, Vite, React Router, Axios, Context API, Recharts |
| Backend | Laravel 13, Laravel Sanctum, API REST, policies de autorização |
| Banco de dados | MySQL |

### Estrutura do projeto

```text
raiz-do-repositorio/
├── expense-tracker-api/
│   ├── app/
│   │   ├── Http/Controllers/       # Autenticação, categorias, lançamentos, recorrências, dashboard
│   │   ├── Models/                 # User, Category, Expense, Income, regras e ocorrências
│   │   ├── Policies/               # Autorização por dono dos dados
│   │   └── Services/               # Preparação, confirmação e exclusão de recorrências
│   ├── database/
│   │   ├── migrations/
│   │   └── seeders/
│   └── routes/api.php
├── expense-tracker-frontend/
│   └── src/
│       ├── api/                    # Cliente Axios e interceptor de token
│       ├── components/charts/      # Gráficos por categoria e de fluxo de caixa mensal
│       ├── components/ui/          # Navegação, idioma, rota protegida, pendências
│       ├── contexts/               # Autenticação e tema
│       ├── hooks/                  # Busca de dados, preparação do dashboard e erros de formulário
│       ├── i18n/                   # Traduções e formatação PT-BR / EN
│       └── pages/                  # Autenticação, dashboard, lançamentos, modal unificado
└── Screenshots/                   # Capturas da interface nos temas claro e escuro
```

### Arquitetura

A aplicação React de página única consome a API REST do Laravel por Axios. O cliente anexa um token bearer do Sanctum às requisições autenticadas. O Laravel valida as requisições, restringe categorias, lançamentos e regras de recorrência ao usuário autenticado, aplica policies de autorização e lê ou grava dados no MySQL. A confirmação de uma recorrência cria o lançamento real e o vincula à ocorrência na mesma transação de banco de dados. O endpoint do dashboard retorna agregados e pendências para o frontend.

```text
React 19 + Router + Context API + Recharts
                  │ HTTP / JSON
                  ▼
Laravel 13 API REST + Sanctum + Policies
                  │
                  ▼
                MySQL
```

#### Relacionamentos dos dados

- Um `User` possui várias categorias, despesas, ganhos e regras de recorrência.
- Uma `Category` pertence a um usuário e pode ser usada por despesas e regras de despesas recorrentes.
- Uma `Expense` pertence a um usuário e a uma categoria.
- Um `Income` pertence a um usuário e não exige categoria.
- Uma `RecurringRule` pertence a um usuário e possui ocorrências mensais `RecurringOccurrence`.
- Cada ocorrência está pendente, confirmada ou pulada; quando confirmada, fica vinculada a uma despesa ou ganho.
- Uma restrição única por regra, ano e mês evita ocorrências mensais duplicadas.

O cadastro cria o usuário e seu catálogo de categorias padrão em uma única transação. A migração de ownership clona as antigas categorias globais para cada conta existente e remapeia as despesas históricas para as cópias corretas.

#### Consultas do dashboard

O dashboard usa somas, agrupamentos por categoria e filtros de data restritos ao usuário autenticado. Os cálculos de saldo usam centavos inteiros. O período selecionado retorna dois saldos:

```text
saldo realizado = ganhos registrados − despesas registradas
saldo projetado = saldo realizado + ganhos pendentes − despesas pendentes
```

Ocorrências pendentes de regras ativas e vigentes contribuem para a projeção. Ocorrências confirmadas e puladas não contribuem; regras pausadas ou vencidas não acrescentam valores previstos. Os valores pendentes seguem o valor atual da regra, enquanto valores confirmados vêm do lançamento histórico.

O frontend primeiro chama `POST /api/recurring-occurrences/prepare` com mês e ano selecionados e depois chama `GET /api/dashboard`. A preparação é idempotente e separada da leitura; o GET do dashboard não gera nem confirma ocorrências. Consumidores da API devem usar essa sequência antes de consultar um período ainda não preparado.

A resposta mantém `total_this_month`, `total_income`, `net_balance`, `by_category` e `last_six_months` e acrescenta:

| Campo | Significado |
| --- | --- |
| `month`, `year` | Período selecionado em valores numéricos. |
| `realized_balance` | Ganhos registrados menos despesas registradas; também retornado como `net_balance`. |
| `projected_balance` | Saldo realizado mais ganhos pendentes menos despesas pendentes. |
| `pending_income`, `pending_expense` | Totais previstos separados. |
| `pending_incomes`, `pending_expenses` | Listas separadas com descrição, valor, data efetiva e categoria, quando aplicável. |

Cada item de `last_six_months` contém `month` e `year` numéricos, `total_income`, `total_expenses` e `realized_balance`. O antigo total de despesas em `total` é preservado; o rótulo localizado `label` foi substituído pela formatação no frontend. A janela de seis meses acompanha o período selecionado, em vez da data atual.

### Conceitos de engenharia

Desenvolvimento full stack · design de APIs REST · autenticação de SPA com Sanctum · React Context API · rotas protegidas · hooks personalizados · CRUD · agregação SQL · policies de autorização · confirmação de recorrências em transação · idempotência · projeções de fluxo de caixa · interface baseada em componentes · visualização de dados · internacionalização · estados de interação acessíveis.

### Execução local

#### Backend

A partir da raiz do repositório:

```bash
cd expense-tracker-api
composer install
cp .env.example .env
```

Configure a conexão MySQL em `expense-tracker-api/.env` e execute:

```bash
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

A API usa `http://localhost:8000` por padrão.

Para a confirmação automática mensal, mantenha o scheduler do Laravel em execução em um terminal separado durante o desenvolvimento local:

```bash
php artisan schedule:work
```

O processador de recorrências está agendado diariamente às 00:10 no fuso horário da aplicação. Para processar uma vez as ocorrências vencidas:

```bash
php artisan recurrences:process
```

Sem o scheduler, as pendências ainda podem ser preparadas e confirmadas manualmente pela interface. Meses futuros podem ser consultados sem confirmar seus lançamentos previstos.

#### Frontend

Em outro terminal, a partir da raiz do repositório:

```bash
cd expense-tracker-frontend
npm install
npm run dev
```

O cliente Axios aponta atualmente para `http://localhost:8000/api`.

#### Verificação

```bash
# Em expense-tracker-api (os testes usam SQLite isolado em memória)
php artisan test

# Em expense-tracker-frontend
npm run lint
npm run build
```

Para validar o fluxo de caixa manualmente, registre em dezembro um salário de R$ 5.000, aluguel de R$ 1.800, bônus avulso de R$ 5.000 e outras despesas de R$ 600. Dezembro deve mostrar R$ 10.000 recebidos, R$ 2.400 gastos e R$ 7.600 realizados. Em janeiro, o bônus não deve se repetir; o aluguel pendente entra nas despesas projetadas sem reduzir o realizado até sua confirmação.

### Próximos passos

- Planejamento de orçamento, metas financeiras e exportação de relatórios
- Paginação e filtros no servidor para históricos maiores de lançamentos
- Divisão do código por rota para reduzir o bundle do frontend
- Configuração da URL da API por ambiente
- Ampliação da cobertura automatizada de lançamentos e recorrências
- Análise de consultas e índices e agregação no banco para históricos maiores de fluxo de caixa

### Sobre o projeto

Desenvolvido como projeto de portfólio para praticar Laravel, React, autenticação com Sanctum, APIs REST, visualização de dados e arquitetura de aplicações full stack. O código usa identificadores em inglês; a interface suporta português brasileiro e inglês.

### Licença e uso comercial

O código original do aflua está disponível sob a [PolyForm Noncommercial License 1.0.0](./LICENSE). O projeto é **source-available**, com código acessível, e não open source segundo a definição da OSI, porque a licença não concede uso comercial.

- **Uso pessoal e não comercial:** é permitido usar, modificar e compartilhar o código para as finalidades previstas na licença, incluindo controle de finanças pessoais, estudo e experimentação não comercial.
- **Créditos:** ao compartilhar o código original ou modificado, inclua a licença ou seu endereço oficial e preserve as linhas `Required Notice:` de [NOTICE](./NOTICE), creditando Nathã Grazzioli Botelho e o repositório original do aflua. A permissão para modificar o código não permite remover esses avisos de autoria.
- **Uso comercial:** aplicativos pagos, serviços por assinatura, adaptações monetizadas ou outros usos comerciais fora das finalidades permitidas pela licença exigem uma licença comercial separada e **autorização prévia por escrito** do autor. As condições financeiras, incluindo a remuneração do autor, precisam ser negociadas e acordadas antes do início do uso comercial. Dar créditos ou enviar uma solicitação não concede autorização comercial.
- **Contato:** [abra uma issue no GitHub](https://github.com/localhost-ayu/aflua/issues) descrevendo a finalidade pretendida e solicitando uma conversa sobre licenciamento comercial. Nenhum e-mail pessoal é publicado aqui.
- **Software de terceiros:** dependências e código de frameworks/templates mantêm suas próprias licenças. Estes termos não alteram o licenciamento de terceiros nem revogam direitos concedidos anteriormente sob outra licença.

O texto em inglês de [LICENSE](./LICENSE) é a licença aplicável; as explicações do README nos dois idiomas são resumos. O software é fornecido sem garantia, conforme a licença. Um eventual serviço oficial hospedado poderá ter termos de uso próprios; usar esse serviço não concede automaticamente uma licença comercial para este código-fonte.

</details>
