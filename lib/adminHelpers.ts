// 상품 하위 데이터(이미지/탑승지/일정) 저장
// 이미지·일정은 삭제 후 재삽입, 탑승지는 예약이 참조하므로 id 보존 방식
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  // 탑승지 — reservations.boarding_point_id 가 FK(on delete set null)로 참조하므로
  // 삭제 후 재삽입하면 기존 예약이 선택했던 탑승지가 조용히 사라진다.
  // 따라서 기존 행은 id를 보존한 채 update 하고, 화면에서 제거된 행만 삭제한다.
  const bp = boarding_points.filter((b: any) => !!b.name?.trim());
  const keepIds: string[] = bp
    .map((b: any) => b.id)
    .filter((id: any) => typeof id === "string" && UUID_RE.test(id));

  let del = sb.from("boarding_points").delete().eq("product_id", productId);
  if (keepIds.length > 0) {
    del = del.not("id", "in", `("${keepIds.join('","')}")`);
  }
  await del;

  for (let i = 0; i < bp.length; i++) {
    const b = bp[i];
    const row = {
      name: b.name.trim(),
      boarding_time: b.boarding_time?.trim() || null,
      address: b.address?.trim() || null,
      memo: b.memo?.trim() || null,
      sort_order: i,
    };
    if (typeof b.id === "string" && UUID_RE.test(b.id)) {
      await sb
        .from("boarding_points")
        .update(row)
        .eq("id", b.id)
        .eq("product_id", productId);
    } else {
      await sb.from("boarding_points").insert({ product_id: productId, ...row });
    }
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
