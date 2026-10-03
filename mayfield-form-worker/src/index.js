const ALLOWED_ORIGINS = new Set([
  "https://mayfieldinvestmentgroup.com",
  "https://www.mayfieldinvestmentgroup.com"
]);
const RECIPIENT = "info@mayfieldinvestmentgroup.com";
const SENDER = "forms@mayfieldinvestmentgroup.com";

const json = (body, status = 200, origin = "") => new Response(JSON.stringify(body), {
  status,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...(origin ? {"Access-Control-Allow-Origin": origin, "Vary": "Origin"} : {})
  }
});

const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[c]));
const clean = (value, max = 2000) => String(value ?? "").trim().slice(0, max);

function validate(data, type) {
  if (!data || typeof data !== "object") return "Invalid request.";
  if (!clean(data.name, 150)) return "Please provide your name.";
  if (!/^\S+@\S+\.\S+$/.test(clean(data.email, 254))) return "Please provide a valid email address.";
  if (type === "apply" && !clean(data.loanType, 100)) return "Please select a financing type.";
  if (type === "contact" && !clean(data.message, 5000)) return "Please enter a message.";
  return null;
}

function buildEmail(type, data) {
  const title = type === "apply" ? "New Financing Inquiry" : "New Website Contact Message";
  const rows = type === "apply"
    ? [
        ["Name", data.name], ["Email", data.email], ["Phone", data.phone],
        ["Preferred contact", data.preferredContact], ["Financing type", data.loanType],
        ["Approximate loan amount", data.loanAmount], ["Property / project location", data.propertyLocation],
        ["Desired timeline", data.timeline], ["Project / financing details", data.message]
      ]
    : [
        ["Name", data.name], ["Email", data.email], ["Phone", data.phone],
        ["Subject", data.subject], ["Message", data.message]
      ];
  const htmlRows = rows.filter(([,v]) => clean(v)).map(([label, value]) => `<tr><td style="padding:8px 12px;border:1px solid #dde5ef;font-weight:700;background:#f6f9fc;vertical-align:top">${escapeHtml(label)}</td><td style="padding:8px 12px;border:1px solid #dde5ef;white-space:pre-wrap">${escapeHtml(clean(value, 5000))}</td></tr>`).join("");
  const text = rows.filter(([,v]) => clean(v)).map(([label, value]) => `${label}: ${clean(value, 5000)}`).join("\n\n");
  return { title, html: `<div style="font-family:Arial,sans-serif;color:#162844"><h2>${title}</h2><table style="border-collapse:collapse;width:100%;max-width:760px">${htmlRows}</table><p style="margin-top:20px;color:#64748b;font-size:12px">Submitted through mayfieldinvestmentgroup.com</p></div>`, text };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") {
      return new Response(null, {status: 204, headers: {"Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://mayfieldinvestmentgroup.com", "Access-Control-Allow-Methods":"POST, OPTIONS", "Access-Control-Allow-Headers":"Content-Type", "Vary":"Origin"}});
    }
    const url = new URL(request.url);
    if (url.pathname !== "/api/apply" && url.pathname !== "/api/contact") return json({message:"Not found."},404);
    if (request.method !== "POST") return json({message:"Method not allowed."},405);
    if (origin && !ALLOWED_ORIGINS.has(origin)) return json({message:"Origin not allowed."},403);
    if (request.headers.get("Content-Type")?.split(";")[0] !== "application/json") return json({message:"JSON request required."},415,origin);
    let data;
    try { data = await request.json(); } catch { return json({message:"Invalid request body."},400,origin); }
    const type = url.pathname.endsWith("/apply") ? "apply" : "contact";
    if (data.website) return json({message:"Thank you."},200,origin);
    const error = validate(data,type);
    if (error) return json({message:error},400,origin);
    const email = buildEmail(type,data);
    try {
      const result = await env.EMAIL.send({
        to: RECIPIENT,
        from: SENDER,
        replyTo: clean(data.email,254),
        subject: `${email.title} — ${clean(data.name,100)}`,
        html: email.html,
        text: email.text
      });
      return json({ok:true, message:type === "apply" ? "Thank you. Your financing inquiry has been sent. A member of our team can follow up with you using the contact information you provided." : "Thank you. Your message has been sent."},200,origin);
    } catch (err) {
      console.error("Email send failed", err);
      return json({message:"We could not send your request right now. Please email info@mayfieldinvestmentgroup.com directly."},502,origin);
    }
  }
};
