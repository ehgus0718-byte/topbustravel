// 상품 하위 데이터(이미지/탑승지/일정) 저장 — 삭제 후 재삽입 방식
export async function saveChildren(sb: any, productId: string, children: any) {
  if (!children) return;
  const { images = [], boarding_points = [], itinerary = [] } = children;

  await sb.from("product_images").delete().eq("product_id", productId);
  if (images.length > 0) {
    await sb.from("product_images").insert(
      images
        .filter((url: string) => !!url?.trim())
        .map((url: string, i: number) => ({
          product_id: productId,
          image_url: url.trim(),
          sort_order: i,
        }))
    );
  }

  await sb.from("boarding_points").delete().eq("product_id", productId);
  const bp = boarding_points.filter((b: any) => !!b.name?.trim());
  if (bp.length > 0) {
    await sb.from("boarding_points").insert(
      bp.map((b: any, i: number) => ({
        product_id: productId,
        name: b.name.trim(),
        boarding_time: b.boarding_time || null,
        sort_order: i,
      }))
    );
  }

  await sb.from("itinerary_items").delete().eq("product_id", productId);
  const it = itinerary.filter((x: any) => !!x.title?.trim());
  if (it.length > 0) {
    await sb.from("itinerary_items").insert(
      it.map((x: any, i: number) => ({
        product_id: productId,
        day_no: Number(x.day_no) || 1,
        time_text: x.time_text || null,
        title: x.title.trim(),
        description: x.description || null,
        image_urls: Array.isArray(x.image_urls)
          ? x.image_urls.filter((u: string) => !!u?.trim())
          : [],
        sort_order: i,
      }))
    );
  }
}
