"""
seed.sql 을 Supabase SQL Editor에 붙여넣을 때 한글이 깨지는 문제를 우회한다.

파일(디스크) 자체는 정상 UTF-8이다. 깨짐은 브라우저 클립보드 붙여넣기
단계에서 발생한다. 이 스크립트는 seed.sql을 직접 파싱해서 REST API로
courses 테이블만 다시 써넣는다 — 클립보드를 거치지 않는다.

일회성 진단·복구 스크립트다. 실행 후 지워도 된다.
"""
import io
import json
import re
import urllib.request

ENV_PATH = ".env.local"
SEED_PATH = "supabase/seed.sql"


def read_env():
    env = {}
    for line in io.open(ENV_PATH, encoding="utf-8"):
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k] = v
    return env


def parse_courses(sql_text):
    # insert 블록 안의 튜플 8개를 정규식으로 뽑는다. 포맷이 고정돼 있어 안전하다.
    pattern = re.compile(
        r"\(\s*'((?:[^'\\]|\\.)*)'\s*,\s*'(field|screen)'\s*,\s*'((?:[^'\\]|\\.)*)'\s*,\s*"
        r"'((?:[^'\\]|\\.)*)'\s*,\s*'((?:[^'\\]|\\.)*)'\s*,\s*\n?\s*'((?:[^'\\]|\\.)*)'\s*,\s*"
        r"'((?:[^'\\]|\\.)*)'\s*\)",
        re.MULTILINE,
    )
    courses = []
    for m in pattern.finditer(sql_text):
        name, ctype, region, address, phone, image_url, description = m.groups()
        courses.append({
            "name": name,
            "type": ctype,
            "region": region,
            "address": address,
            "phone": phone,
            "image_url": image_url,
            "description": description,
        })
    return courses


def patch_course(base_url, service_key, image_url, fields):
    # image_url은 순수 ASCII라 클립보드/인코딩 문제에서 자유롭다. 이걸로 행을 특정한다.
    from urllib.parse import quote
    url = f"{base_url}/rest/v1/courses?image_url=eq.{quote(image_url, safe='')}"
    body = json.dumps(fields, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(url, data=body, method="PATCH")
    req.add_header("apikey", service_key)
    req.add_header("Authorization", f"Bearer {service_key}")
    req.add_header("Content-Type", "application/json; charset=utf-8")
    req.add_header("Prefer", "return=representation")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))


def main():
    env = read_env()
    base_url = env["NEXT_PUBLIC_SUPABASE_URL"]
    service_key = env["SUPABASE_SERVICE_ROLE_KEY"]

    sql_text = io.open(SEED_PATH, encoding="utf-8").read()
    courses = parse_courses(sql_text)
    print(f"파일에서 파싱된 골프장: {len(courses)}곳")

    for c in courses:
        fields = {k: v for k, v in c.items() if k != "image_url"}
        result = patch_course(base_url, service_key, c["image_url"], fields)
        if result:
            print(f"  OK  {result[0]['name']}  ({c['image_url'][-20:]})")
        else:
            print(f"  경고: 매칭되는 행 없음 — {c['image_url']}")

    print("\n완료. 결과를 API로 다시 조회해 검증한다.")


if __name__ == "__main__":
    main()
