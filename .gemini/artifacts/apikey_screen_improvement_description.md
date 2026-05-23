Este é um PRD (Product Requirements Document) estruturado para a reformulação do seu painel de Gerenciamento de APIs e Logs, consolidando todas as melhorias de layout e funcionalidades discutidas.

PRD: Painel de Gerenciamento de API & Monitoring (v2.0)

1. Visão Geral
O objetivo deste projeto é transformar a tela atual de gerenciamento de chaves API em uma central de comando profissional para traders de criptomoedas. O foco está na eficiência operacional, monitoramento de performance em tempo real e uma interface limpa que suporte múltiplas conexões simultâneas.

2. Objetivos Estratégicos
Maximização de Espaço: Expandir a visualização de dados removendo painéis redundantes.
Monitoramento Ativo: Introduzir métricas visuais de latência e throughput diretamente na tabela principal.
Gestão Ágil: Facilitar o acesso a funções de edição, desativação e remoção de chaves.
Estética Profissional: Adotar um visual Dark Mode moderno com elementos de "Developer Experience" (DX).
3. Personas
Trader Profissional: Gerencia múltiplas contas em diferentes exchanges e precisa de confirmação visual rápida de que todas as conexões estão saudáveis.
Desenvolvedor/Analista: Utiliza os logs para depurar ordens e precisa de uma interface técnica e precisa.
4. Requisitos Funcionais
4.1. Tabela de Conexões (API Connections)
Layout Expandido: A tabela deve ocupar a largura total da tela após a remoção do quadro de configurações antigo.
Coluna de Exchange/Conta: Exibir o ícone da exchange (Bybit, Binance, etc.) seguido do nome customizado da conexão (Ex: "Conta Principal Market Making").
Colunas de Performance (Novas):
Latency: Mini gráfico (sparkline) mostrando a variação de milissegundos nas últimas chamadas.
Throughput: Indicador visual (barra ou gauge) de volume de dados/requisições por segundo.
Ações Rápidas: Botões dedicados por linha:
Edit: Abre modal de edição de permissões/nomes.
Disable/Enable: Toggle switch para ativar/desativar a chave sem excluí-la.
Remove: Ação de exclusão com confirmação.
4.2. Cabeçalho e Navegação
Botão New API Key: Reposicionado para o canto superior direito da tabela, alinhado ao título principal.
Search/Filtro: Campo de busca rápida por nome de conexão ou exchange.
4.3. Terminal de Logs (Docked Terminal)
Área Fixa: Mantido na base da tela para monitoramento contínuo.
Funcionalidades: Scroll automático, botão de "Clear Logs" e opção de expandir para tela cheia.
5. Requisitos de Design (UX/UI)
Tema: Dark Mode (Deep Charcoal/Black background).
Feedback Visual: Uso de cores semânticas (Verde para Active/Baixa Latência, Vermelho para Erros/Alta Latência).
Densidade de Dados: Opção de visualização compacta para usuários com mais de 10 chaves API.
6. Critérios de Aceite
O usuário deve conseguir alternar o status de uma API com no máximo 2 cliques.
Os gráficos de latência devem ser atualizados via WebSocket sem degradar a performance do navegador.
A interface deve ser responsiva para diferentes tamanhos de monitores desktop.
Este documento serve como guia para o desenvolvimento e implementação das telas geradas. Deseja adicionar alguma regra de negócio específica ou métrica técnica ao PRD?
