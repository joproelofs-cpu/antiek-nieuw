// Cloudflare Pages Function — secure Mollie checkout.
// The Mollie API key is read from the environment variable MOLLIE_API_KEY
// (set it in Cloudflare: Pages project -> Settings -> Environment variables).
// It is NEVER stored in the website code, so it can't be stolen from the browser.
//
// The product prices live here, on the server side, so the amount can't be
// tampered with from the browser. Keep these in sync with js/products.js.

const PRODUCTS = {
  kapstok:  { value: "480.00",  name: "Space-age coat stand in cream" },
  buste:    { value: "1250.00", name: "Bronze bust of David" },
  trolley:  { value: "650.00",  name: "Boby trolley — Joe Colombo" },
  spiegel:  { value: "2200.00", name: "Gilded floor mirror, oval" },
  fauteuil: { value: "1650.00", name: "Black & white swivel chair" },
  tafel:    { value: "1900.00", name: "Wooden coffee table" },
  rolkast:  { value: "1450.00", name: "Op-art rolling cabinet" },
  mc_lounge:{ value: "1250.00", name: "Orange & yellow swivel lounge chair" },
  mc_bar:   { value: "1450.00", name: "Chrome & smoked-glass bar cart" },
  mc_green: { value: "680.00",  name: "Green leather office chair" }
};

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const product = PRODUCTS[id];

  if (!product) {
    return new Response("Unknown product.", { status: 400 });
  }
  if (!env.MOLLIE_API_KEY) {
    return new Response(
      "Payment is not configured yet. Set MOLLIE_API_KEY in the Cloudflare Pages environment variables.",
      { status: 503 }
    );
  }

  const res = await fetch("https://api.mollie.com/v2/payments", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + env.MOLLIE_API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      amount: { currency: "EUR", value: product.value },
      description: "Collector's Room — " + product.name,
      redirectUrl: url.origin + "/?paid=" + encodeURIComponent(id),
      metadata: { productId: id }
    })
  });

  const data = await res.json();
  const checkout = data && data._links && data._links.checkout && data._links.checkout.href;

  if (!checkout) {
    return new Response("Could not start payment: " + JSON.stringify(data), { status: 502 });
  }
  return Response.redirect(checkout, 302);
}
