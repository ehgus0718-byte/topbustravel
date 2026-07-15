export interface Category {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
}

export interface Product {
  id: string;
  category_id: string | null;
  title: string;
  slug: string;
  product_code: string | null; // 자동 생성 상품코드 (YYYYMMDD + 3자리 순번, DB 트리거)
  summary: string | null;
  description: string | null;
  duration_text: string;
  base_price: number;
  child_price: number | null;
  infant_price: number;
  thumbnail_url: string | null;
  is_featured: boolean;
  is_active: boolean;
  includes: string[];
  excludes: string[];
  optional_items: string[];
  notices: string | null;
  refund_policy: string | null;
  created_at: string;
  category?: Pick<Category, "name" | "slug"> | null;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  sort_order: number;
}

export interface Departure {
  id: string;
  product_id: string;
  departure_date: string; // YYYY-MM-DD
  adult_price: number | null;
  child_price: number | null;
  infant_price: number | null;
  total_seats: number;
  reserved_seats: number;
  min_seats: number; // 최소출발인원 (0 = 미사용)
  status: "open" | "closed" | "canceled";
}

export interface BoardingPoint {
  id: string;
  product_id: string;
  name: string;
  boarding_time: string | null;
  sort_order: number;
}

export interface ItineraryItem {
  id: string;
  product_id: string;
  day_no: number;
  time_text: string | null;
  title: string;
  description: string | null;
  sort_order: number;
}

export interface Review {
  id: string;
  product_id: string;
  author_name: string;
  rating: number;
  content: string;
  is_visible: boolean;
  created_at: string;
}

export type ReservationStatus = "pending" | "paid" | "confirmed" | "canceled" | "refunded";

export interface Reservation {
  id: string;
  product_id: string | null;
  departure_id: string | null;
  boarding_point_id: string | null;
  customer_name: string;
  customer_phone: string;
  adult_count: number;
  child_count: number;
  infant_count: number;
  total_amount: number;
  status: ReservationStatus;
  payment_method: "card" | "bank" | null;
  payment_tid: string | null;
  paid_at: string | null;
  request_memo: string | null;
  admin_note: string | null;
  created_at: string;
  product?: Pick<Product, "title" | "slug"> | null;
  departure?: Pick<Departure, "departure_date"> | null;
  boarding_point?: Pick<BoardingPoint, "name" | "boarding_time"> | null;
}

export interface Inquiry {
  id: string;
  product_id: string | null;
  name: string;
  phone: string;
  message: string;
  status: "new" | "done";
  created_at: string;
  product?: Pick<Product, "title"> | null;
}

export interface ProductDetail extends Product {
  images: ProductImage[];
  boarding_points: BoardingPoint[];
  itinerary: ItineraryItem[];
  reviews: Review[];
  departures: Departure[];
}

export type SiteSettings = Record<string, string>;
