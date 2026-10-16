// Brazilian Portuguese. Draft in the locale registry until a native-speaker
// review has been done, so it's only shown to someone who explicitly
// chooses it. Any key left out here falls back to English per key.
//
// Labels use Portuguese sentence case ("Pinturas e retratos"), not the
// English title case of the source strings.
import type { Dictionary } from "./en";

export const ptBR: Dictionary = {
  "upsell.body":
    "Salvo temporariamente neste navegador. Coleções permanentes e organização fazem parte do Pro, que ainda está tomando forma.",
  "upsell.cta": "Entrar na lista de espera",
  "upsell.dismiss": "Fechar",

  "intro.heading": "Um jeito mais calmo de navegar.",
  // Portuguese treats 0 and 1 as singular ("0 acervo"), so .one covers both.
  "intro.tagline.one":
    "Navegue com calma por {works} obras em domínio público de {count} acervo.",
  "intro.tagline.other":
    "Navegue com calma por {works} obras em domínio público de {count} acervos.",
  "intro.mission.title": "Missão",
  "intro.mission.body": "Código aberto e sem anúncios.",
  "intro.mission.cta": "Participe",
  "intro.connect.title": "Conecte-se",
  "intro.connect.body": "Arte selecionada todo mês.",
  "intro.connect.cta": "Inscreva-se",
  "intro.support.title": "Apoie",
  "intro.support.body": "Mantido pela comunidade.",
  "intro.support.cta": "Doe",

  "collection.empty.eyebrow": "Minha coleção",
  "collection.empty.title": "Nada salvo\nainda.",
  "collection.empty.body": "Toque no marcador de qualquer obra para começar.",

  "common.untitled": "Sem título",

  "slide.nudity.label": "Esta imagem pode conter nudez. Toque para ver.",
  "slide.nudity.line1": "Pode conter nudez",
  "slide.nudity.line2": "Toque para ver",
  "slide.imageError":
    "Não foi possível carregar a imagem — toque para tentar de novo",
  "slide.storylineChip": "Narrativa · {position}",
  "slide.position": "{index} de {total}",
  "slide.setPosition": "{index} de {total} no conjunto",
  "slide.share": "Copiar link para compartilhar",
  "slide.collect.add": "Salvar esta obra",
  "slide.collect.remove": "Remover da coleção",

  "detail.close": "Fechar",
  "detail.shelfPrev": "Anterior nesta estante",
  "detail.shelfNext": "Próxima nesta estante",
  "detail.source": "Fonte",
  "detail.sourceHost": "Fonte: {host}",
  "detail.sources": "Fontes",
  "detail.twist": "A reviravolta",
  "detail.cast.title": "Conheça os personagens",
  "detail.cast.possibly": "Possivelmente {name}",
  "detail.cast.noDetail": "Ainda não há detalhes verificados.",
  "detail.fact.didYouKnow": "Você sabia?",
  "detail.fact.basic": "Informações básicas",
  "detail.meta.artist": "Artista",
  "detail.meta.created": "Criação",
  "detail.meta.material": "Material",
  "detail.meta.artistOrigin": "Origem do artista",
  "detail.meta.objectOrigin": "Origem do objeto",
  "detail.meta.origin": "Origem",
  "detail.meta.culture": "Cultura",
  "detail.meta.photographDate": "Data da fotografia",
  "detail.meta.provenance": "Procedência",
  "detail.meta.tagged": "Marcadores",
  "detail.meta.license": "Licença",
  "detail.report.button": "Relatar um problema",
  "detail.report.image": "Há um problema com a imagem",
  "detail.report.content": "Há um problema com o conteúdo",
  "detail.report.technical": "Estou com um problema técnico (link quebrado)",
  "detail.report.more": "Conte mais",
  "detail.report.commentPlaceholder": "Mais alguma coisa? (opcional)",
  "detail.report.send": "Enviar",
  "detail.report.thanks":
    "Obrigado, seu comentário foi enviado. Vamos dar uma olhada.",

  "search.placeholder": "Busque artista, título, categoria, época…",
  "search.submit": "Buscar",
  "search.close": "Fechar a busca",
  "search.recent": "Buscas recentes",
  "search.browseBy": "Explore por",
  "search.related": "Mostrando obras relacionadas a “{concept}”",
  "search.results.one": "{count} resultado para “{query}”",
  "search.results.other": "{count} resultados para “{query}”",
  "search.noResults": "Nenhum resultado para “{query}”.",
  "search.didYouMean":
    "Nenhum resultado para “{query}”. Você quis dizer {suggestion}?",

  "filter.moreBy": "Mais de {artist}",
  "filter.collection": "{title} ({count})",
  "collection.toast.empty": "Nada salvo ainda",

  "share.copied": "Link copiado",
  "share.failed": "Não foi possível copiar o link",

  "error.heading": "Estamos com um problema agora, mas voltaremos em breve.",
  "error.retry": "Tentar de novo",
  "error.home": "Voltar ao Tranquilo",

  "support.strip.line":
    "O Tranquilo é mantido por apoio direto, não por anúncios.",
  "support.strip.unavailable":
    "As doações estão indisponíveis por um momento. Obrigado pela vontade de ajudar — tente de novo em breve.",
  "support.strip.soon": "As doações abrem em breve.",
  "support.strip.donate": "Doar",
  "support.dialog.close": "Fechar",
  "support.dialog.title": "Apoie o Tranquilo",
  "support.dialog.body":
    "Cada contribuição vai para a hospedagem e para o custo silencioso de manter tudo funcionando.",
  "support.dialog.once": "Doação única",
  "support.dialog.monthly": "Doação mensal",
  "support.dialog.perMonth": "por mês",
  "support.dialog.note":
    "O pagamento é feito pelo Stripe — o Tranquilo nunca vê os dados do seu cartão. Os valores aparecem na sua moeda no momento do pagamento.",
  "support.once.note": "Escolha o valor",

  "shelves.home": "Tranquilo, voltar à página inicial",
  "shelves.title": "Descobrir",
  "shelves.close": "Fechar Descobrir",
  "shelves.storylines.title": "Narrativas",
  "shelves.storylines.subtitle": "Histórias selecionadas por trás da arte",
  "shelves.moods.title": "Estantes, feitas à mão",
  "shelves.moods.subtitle": "Escolha um clima e aproveite",

  "storyline.close": "Fechar a narrativa",
  "storyline.prev": "Página anterior",
  "storyline.next": "Próxima página",
  "storyline.hint.arrows": "Use as setas para começar →",
  "storyline.hint.swipe": "Deslize para começar →",
  "storyline.share": "Copiar link desta narrativa",
  "storyline.chapterOf": "Capítulo {index} de {total}",
  "storyline.goToChapter": "Ir para o capítulo {index}",

  "setOfWorks.details": "Ver detalhes",

  "export.title": "Seu CSV está sendo baixado",
  "export.body":
    "Sincronizar entre dispositivos, organizar listas e compartilhar fazem parte do Pro, que ainda está tomando forma.",

  "lightbox.loading": "Carregando em resolução máxima…",
  "lightbox.sourceRecord": "Registro original: {institution}",
  "lightbox.fullResolution": "Resolução máxima: {institution}",

  "topbar.shareBanner.text":
    "O Tranquilo é de código aberto e mantido por voluntários.",
  "topbar.shareBanner.newsletter": "Receber a newsletter",
  "topbar.shareBanner.involved": "Participe",
  "topbar.shareBanner.dismiss": "Fechar",
  "topbar.home": "Tranquilo, voltar ao início",
  "topbar.music": "Ligar ou desligar a música",
  "topbar.search": "Buscar",
  "topbar.discover": "Descobrir estantes",
  "topbar.collection.label": "Minha coleção",
  "topbar.collection.empty": "Minha coleção, vazia",
  "topbar.collection.count.one": "Minha coleção, {count} obra",
  "topbar.collection.count.other": "Minha coleção, {count} obras",
  "topbar.filter.export": "Exportar",
  "topbar.filter.clear": "Mostrar tudo",
  "artistCard.wikipedia": "Leia mais na Wikipédia",
  "artistCard.wikidata": "Ver no Wikidata",

  "chips.all": "Todos",
  "chips.storyline": "Narrativas",
  "chips.more": "Mais",

  "facet.category.paintings-portraits": "Pinturas e retratos",
  "facet.category.sculpture-objects": "Esculturas e objetos",
  "facet.category.works-on-paper": "Obras sobre papel",
  "facet.category.arms-armor": "Armas e armaduras",
  "facet.category.photography": "Fotografia",

  "facet.region.europe": "Europa",
  "facet.region.east-asia": "Ásia Oriental",
  "facet.region.south-asia": "Sul da Ásia",
  "facet.region.southeast-asia": "Sudeste Asiático",
  "facet.region.west-asia-middle-east": "Ásia Ocidental e Oriente Médio",
  "facet.region.africa": "África",
  "facet.region.americas": "Américas",
  "facet.region.oceania": "Oceania",

  "facet.timeframe.ancient-classical": "Antiguidade",
  "facet.timeframe.medieval": "Idade Média",
  "facet.timeframe.renaissance": "Renascimento",
  "facet.timeframe.baroque-enlightenment": "Barroco e Iluminismo",
  "facet.timeframe.19th-century": "Século XIX",
  "facet.timeframe.modern-contemporary": "Moderno e contemporâneo",

  "facet.media_type.painting": "Pintura",
  "facet.media_type.print-drawing": "Gravura/desenho",
  "facet.media_type.photograph": "Fotografia",
  "facet.media_type.ceramic": "Cerâmica",
  "facet.media_type.metalwork": "Trabalho em metal",
  "facet.media_type.stone-sculpture": "Escultura em pedra",
  "facet.media_type.textile": "Têxtil",
  "facet.media_type.glass": "Vidro",
  "facet.media_type.decorative-object": "Objeto decorativo",

  "facet.palette.red": "Vermelho",
  "facet.palette.orange": "Laranja",
  "facet.palette.gold-yellow": "Dourado/amarelo",
  "facet.palette.green": "Verde",
  "facet.palette.teal": "Verde-azulado",
  "facet.palette.blue": "Azul",
  "facet.palette.purple": "Roxo",
  "facet.palette.pink": "Rosa",
  "facet.palette.neutral": "Neutro",

  "facet.subject_type.portrait": "Retrato",
  "facet.subject_type.religious": "Religioso",
  "facet.subject_type.landscape": "Paisagem",
  "facet.subject_type.genre-scene": "Cena de gênero",
  "facet.subject_type.still-life": "Natureza-morta",
  "facet.subject_type.other": "Outro",
};
