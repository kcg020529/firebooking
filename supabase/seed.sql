-- ============================================================
--  firebooking · 시드 데이터
--  schema.sql → policies.sql 실행 후에 이 파일을 실행한다.
--
--  실제 골프장이 아니라 시연·개발용 가짜 데이터다.
--  이미지는 Unsplash 고정 사진 ID를 쓴다 — 매번 랜덤이면
--  발표 당일 화면이 리허설 때와 달라질 수 있어서 고정했다.
--
--  이 파일은 여러 번 돌려도 안전하다. 먼저 지우고 다시 채운다.
-- ============================================================

-- 재실행 시 기존 시드 데이터 제거 (사용자가 만든 실제 예약은 건드리지 않는다)
delete from public.bookings where slot_id in (
  select s.id from public.slots s
  join public.courses c on c.id = s.course_id
  where c.name in (
    '그린힐 컨트리클럽', '선셋베이 골프리조트', '파인밸리 골프클럽', '오크우드 컨트리클럽',
    '스카이스크린 강남점', '버디존 스크린골프 홍대', '그랜드스윙 판교점', '이글파크 스크린 수원점'
  )
);
delete from public.slots where course_id in (
  select id from public.courses where name in (
    '그린힐 컨트리클럽', '선셋베이 골프리조트', '파인밸리 골프클럽', '오크우드 컨트리클럽',
    '스카이스크린 강남점', '버디존 스크린골프 홍대', '그랜드스윙 판교점', '이글파크 스크린 수원점'
  )
);
delete from public.courses where name in (
  '그린힐 컨트리클럽', '선셋베이 골프리조트', '파인밸리 골프클럽', '오크우드 컨트리클럽',
  '스카이스크린 강남점', '버디존 스크린골프 홍대', '그랜드스윙 판교점', '이글파크 스크린 수원점'
);

-- ────────────────────────────────────────────────────────────
--  1. 골프장 8곳 — 필드 4 + 스크린 4
-- ────────────────────────────────────────────────────────────

insert into public.courses (name, type, region, address, phone, image_url, description) values
  ('그린힐 컨트리클럽',   'field',  '경기', '경기도 용인시 처인구 그린힐로 123', '031-555-0101',
   'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&q=80',
   '18홀 챔피언십 코스. 완만한 구릉지형으로 초중급자에게 적합하다.'),

  ('선셋베이 골프리조트', 'field',  '강원', '강원도 춘천시 선셋베이길 45',   '033-555-0202',
   'https://images.unsplash.com/photo-1600607687644-c7171b42498f?w=800&q=80',
   '호수를 낀 27홀 리조트 코스. 노을 무렵 라운딩이 유명하다.'),

  ('파인밸리 골프클럽',   'field',  '충북', '충청북도 청주시 파인밸리로 78', '043-555-0303',
   'https://images.unsplash.com/photo-1577223625816-7546f13df25d?w=800&q=80',
   '소나무숲으로 둘러싸인 18홀. 페어웨이가 좁아 정교한 샷이 필요하다.'),

  ('오크우드 컨트리클럽', 'field',  '경남', '경상남도 양산시 오크우드길 12', '055-555-0404',
   'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&q=80',
   '산악 지형 27홀. 고저차가 커 상급자에게 도전적인 코스로 평가된다.'),

  ('스카이스크린 강남점', 'screen', '서울', '서울특별시 강남구 테헤란로 501, 3층', '02-555-1001',
   'https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=800&q=80',
   '최신 시뮬레이터 8타석. 예약제로 운영해 대기 없이 이용 가능하다.'),

  ('버디존 스크린골프 홍대', 'screen', '서울', '서울특별시 마포구 홍익로 88, 2층', '02-555-1002',
   'https://images.unsplash.com/photo-1592919505780-303950717480?w=800&q=80',
   '홍대입구역 도보 3분. 24시간 운영, 심야 할인 타임 있음.'),

  ('그랜드스윙 판교점',   'screen', '경기', '경기도 성남시 분당구 판교역로 231', '031-555-1003',
   'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=800&q=80',
   '실내 6타석 프리미엄 매장. 개인 레슨 프로 상주.'),

  ('이글파크 스크린 수원점', 'screen', '경기', '경기도 수원시 영통구 광교로 15', '031-555-1004',
   'https://images.unsplash.com/photo-1598981457915-aea220950616?w=800&q=80',
   '광교신도시 신축 매장. 넓은 타석과 라운지 공간이 특징.');

-- ────────────────────────────────────────────────────────────
--  2. 슬롯 — 내일부터 14일치, 골프장마다 하루 4~5타임
--
--  seed.sql 을 언제 실행하든 "오늘부터 14일"이 되도록 CURRENT_DATE 기준으로 생성한다.
--  날짜를 하드코딩하면 실행 시점에 따라 과거 날짜가 생겨 화면에 안 보이는 문제가 생긴다.
-- ────────────────────────────────────────────────────────────

do $$
declare
  v_course record;
  v_day    int;
  v_slot_date date;
  v_time_list time[];
  v_time  time;
  v_price int;
  v_capacity int;
begin
  for v_course in select id, type from public.courses where name in (
    '그린힐 컨트리클럽', '선셋베이 골프리조트', '파인밸리 골프클럽', '오크우드 컨트리클럽',
    '스카이스크린 강남점', '버디존 스크린골프 홍대', '그랜드스윙 판교점', '이글파크 스크린 수원점'
  )
  loop
    -- 필드골프는 아침~낮 티타임, 스크린골프는 저녁까지 회전이 빠른 타임을 흉내낸다.
    if v_course.type = 'field' then
      v_time_list := array['07:00','08:30','10:00','12:30','14:00']::time[];
      v_price := 90000;
      v_capacity := 4;
    else
      v_time_list := array['10:00','12:00','14:00','16:00','18:00','20:00']::time[];
      v_price := 25000;
      v_capacity := 4;
    end if;

    for v_day in 1..14 loop
      v_slot_date := current_date + v_day;

      foreach v_time in array v_time_list loop
        insert into public.slots (course_id, date, time, price, capacity, booked)
        values (v_course.id, v_slot_date, v_time, v_price, v_capacity, 0)
        on conflict (course_id, date, time) do nothing;
      end loop;
    end loop;
  end loop;
end $$;

-- ============================================================
--  검증
-- ============================================================

-- select type, count(*) from public.courses group by type;
--   -- field 4, screen 4 가 나와야 한다.
--
-- select course_id, count(*) from public.slots group by course_id;
--   -- 필드는 5타임×14일=70, 스크린은 6타임×14일=84 여야 한다.
--
-- select min(date), max(date) from public.slots;
--   -- 오늘+1 ~ 오늘+14 범위여야 한다.
