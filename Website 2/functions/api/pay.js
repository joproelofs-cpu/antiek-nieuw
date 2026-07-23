// Cloudflare Pages Function — secure Mollie checkout (item + shipping).
// The Mollie API key is read from env var MOLLIE_API_KEY (set it in
// Cloudflare: Pages project -> Settings -> Environment variables).
// Prices and shipping are computed HERE, server-side, so the amount can't be
// tampered with from the browser. Keep in sync with js/catalog.js.

const PRODUCTS = {
  kapstok:  { value: 480,  ship: "L", name: "Space-age coat stand in cream" },
  buste:    { value: 1250, ship: "M", name: "Bronze bust of David" },
  trolley:  { value: 650,  ship: "L", name: "Boby trolley — Joe Colombo" },
  spiegel:  { value: 2200, ship: "L", name: "Gilded floor mirror, oval" },
  fauteuil: { value: 1650, ship: "L", name: "Black & white swivel chair" },
  tafel:    { value: 1900, ship: "L", name: "Wooden coffee table" },
  rolkast:  { value: 1450, ship: "L", name: "Op-art rolling cabinet" },
  mc_lounge:{ value: 1250, ship: "L", name: "Orange & yellow swivel lounge chair" },
  mc_bar:   { value: 1450, ship: "L", name: "Chrome & smoked-glass bar cart" },
  mc_green: { value: 680,  ship: "M", name: "Green leather office chair" }
};

const SHIP = {
  M: { nl: 15, eu1: 35, eu: 55, uk: 75, world: 140 },
  L: { nl: 60, eu1: 120, eu: 210, uk: 290, world: 580 }
};

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const zone = url.searchParams.get("zone") || "nl";
  const product = PRODUCTS[id];

  if (!product) return new Response("Unknown product.", { status: 400 });
  if (!env.MOLLIE_API_KEY) {
    return new Response(
      "Payment is not configured yet. Set MOLLIE_API_KEY in the Cloudflare Pages environment variables.",
      { status: 503 }
    );
  }

  const rates = SHIP[product.ship] || SHIP.L;
  const shipping = (zone in rates) ? rates[zone] : rates.nl;
  const total = (product.value + shipping).toFixed(2);

  const res = await fetch("https://api.mollie.com/v2/payments", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + env.MOLLIE_API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      amount: { currency: "EUR", value: total },
      description: "Collector's Room — " + product.name + " (incl. shipping " + zone + ")",
      redirectUrl: url.origin + "/?paid=" + encodeURIComponent(id),
      metadata: { productId: id, zone: zone, shipping: shipping }
    })
  });

  const data = await res.json();
  const checkout = data && data._links && data._links.checkout && data._links.checkout.href;
  if (!checkout) return new Response("Could not start payment: " + JSON.stringify(data), { status: 502 });
  return Response.redirect(checkout, 302);
}
