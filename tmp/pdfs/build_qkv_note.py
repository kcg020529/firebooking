from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    KeepTogether, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
)

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "output/pdf/attention_qkv_학습노트.pdf"
FONT = "/System/Library/Fonts/Supplemental/AppleGothic.ttf"

pdfmetrics.registerFont(TTFont("Korean", FONT))

PAGE_W, PAGE_H = A4
styles = getSampleStyleSheet()

def style(name, **kwargs):
    base = ParagraphStyle(name, fontName="Korean", **kwargs)
    return base

TITLE = style("TitleKR", fontSize=23, leading=31, textColor=colors.HexColor("#102A43"), alignment=TA_CENTER)
SUBTITLE = style("SubtitleKR", fontSize=10.5, leading=16, textColor=colors.HexColor("#52606D"), alignment=TA_CENTER)
H1 = style("H1KR", fontSize=15, leading=22, textColor=colors.HexColor("#0B5E55"), spaceBefore=14, spaceAfter=7)
H2 = style("H2KR", fontSize=11.5, leading=18, textColor=colors.HexColor("#102A43"), spaceBefore=9, spaceAfter=4)
BODY = style("BodyKR", fontSize=9.5, leading=16, textColor=colors.HexColor("#243B53"), spaceAfter=5)
SMALL = style("SmallKR", fontSize=8.3, leading=13, textColor=colors.HexColor("#52606D"))
BOX = style("BoxKR", fontSize=10.4, leading=17, textColor=colors.HexColor("#102A43"))
EQUATION = style("EqKR", fontSize=12, leading=20, alignment=TA_CENTER, textColor=colors.HexColor("#173F5F"))

def p(text, sty=BODY):
    return Paragraph(text, sty)

def box(text, color="#E6FFFA", border="#38B2AC"):
    t = Table([[p(text, BOX)]], colWidths=[170 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(color)),
        ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor(border)),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    return t

def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Korean", 7.5)
    canvas.setFillColor(colors.HexColor("#7B8794"))
    canvas.drawString(20 * mm, 12 * mm, "Attention Mechanism 학습 노트 - Q, K, V")
    canvas.drawRightString(PAGE_W - 20 * mm, 12 * mm, str(doc.page))
    canvas.restoreState()

doc = SimpleDocTemplate(
    str(OUTPUT), pagesize=A4,
    leftMargin=20 * mm, rightMargin=20 * mm, topMargin=18 * mm, bottomMargin=20 * mm,
    title="Attention Mechanism - Q, Key, Value 학습 노트",
    author="firebooking 학습 자료",
)

story = []
story += [Spacer(1, 15 * mm), p("Attention Mechanism", TITLE), p("Query, Key, Value를 직관 - 수식 - 사례로 연결하는 학습 노트", SUBTITLE), Spacer(1, 9 * mm)]
story.append(box("<b>핵심 문장</b><br/>Q와 K는 <b>누구를 참고할지</b> 정하는 주소 체계이고, V는 실제로 <b>가져와 합성할 정보</b>다. Q, K, V는 입력에 원래 존재하는 세 종류의 데이터가 아니라, 학습되는 서로 다른 선형 투영(projection)이다."))

story += [p("1. 먼저 버려야 할 오해", H1)]
rows = [
    [p("오해", SMALL), p("교정", SMALL)],
    [p("Q는 질문, K는 열쇠, V는 정답이다.", BODY), p("비유일 뿐이다. 실제로는 모두 같은 토큰 표현에서 서로 다른 행렬로 만든 벡터다.", BODY)],
    [p("K에는 토큰의 의미가, V에는 값이 들어 있다.", BODY), p("K는 Q와의 <b>매칭</b>에 유리하도록, V는 다음 레이어에 <b>전달</b>하기 유리하도록 학습된다.", BODY)],
    [p("하나의 attention head가 하나의 명시적 문법 규칙을 담당한다.", BODY), p("그런 보장은 없다. 특정 관계를 잘 포착하는 head가 관찰될 수는 있지만, 기능은 분산되고 층마다 바뀐다.", BODY)],
]
t = Table(rows, colWidths=[61 * mm, 109 * mm], repeatRows=1)
t.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#D9E2EC")),
    ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#BCCCDC")),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("LEFTPADDING", (0, 0), (-1, -1), 7), ("RIGHTPADDING", (0, 0), (-1, -1), 7),
    ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
]))
story += [t, p("2. 수식: 같은 입력에서 세 관점을 만든다", H1)]
story += [p("문장 속 i번째 토큰의 현재 표현을 xᵢ라고 하면, 한 attention head는 다음을 계산한다.", BODY), p("qᵢ = xᵢW<sub>Q</sub> &nbsp;&nbsp;&nbsp; kᵢ = xᵢW<sub>K</sub> &nbsp;&nbsp;&nbsp; vᵢ = xᵢW<sub>V</sub>", EQUATION)]
story += [p("W<sub>Q</sub>, W<sub>K</sub>, W<sub>V</sub>는 훈련으로 학습되는 서로 다른 가중치 행렬이다. 입력 xᵢ는 하나지만, 모델은 목적이 다른 세 벡터를 만든다. self-attention에서는 <b>각 토큰이 Q, K, V를 모두 가진다.</b>", BODY)]

story += [p("3. 구체적 사례: ‘그는’이 누구를 가리키는가", H1)]
story += [box("문장: <b>‘철수가 영희에게 책을 주었고, 그는 웃었다.’</b><br/>목표: ‘그는’ 토큰의 새 표현을 만들 때, 앞 문맥의 어느 토큰을 얼마나 참고할지 정한다.", "#FFF5F5", "#FC8181")]
story += [p("① ‘그는’은 자신의 Query q<sub>그는</sub>를 만든다. 학습이 잘 됐다면 이 방향은 ‘앞 문맥에서 남성 단수 인물 후보를 찾아라’ 같은 패턴에 반응할 수 있다. 이것은 사람이 코딩한 규칙이 아니라 데이터와 역전파가 만든 표현이다.", BODY)]
step_two_intro = p("② ‘그는’의 Query를 모든 토큰의 Key와 내적한다.", BODY)
step_two_equation = p("sⱼ = q<sub>그는</sub> · kⱼ", EQUATION)
score_rows = [
    [p("후보 토큰", SMALL), p("Q·K 점수", SMALL), p("해석", SMALL)],
    [p("철수", BODY), p("8.0", BODY), p("‘그는’의 Query와 가장 잘 맞는 Key", BODY)],
    [p("영희", BODY), p("2.1", BODY), p("인물이지만 이 문맥에서는 덜 일치", BODY)],
    [p("책", BODY), p("-0.5", BODY), p("사물 - 관련도 낮음", BODY)],
    [p("주었고", BODY), p("0.7", BODY), p("동사 - 일부 문맥 관계만 있음", BODY)],
]
st = Table(score_rows, colWidths=[38 * mm, 32 * mm, 100 * mm], repeatRows=1)
st.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#D9E2EC")),
    ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#BCCCDC")),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("LEFTPADDING", (0, 0), (-1, -1), 7), ("RIGHTPADDING", (0, 0), (-1, -1), 7),
    ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
]))
story += [KeepTogether([step_two_intro, step_two_equation, st])]
story += [p("③ softmax가 점수를 가중치로 바꾼다. 예를 들어 철수 0.94, 영희 0.06, 나머지는 거의 0이 될 수 있다.", BODY), p("αⱼ = softmax(sⱼ / √d<sub>k</sub>)", EQUATION)]
story += [p("④ 마지막으로 이 가중치로 <b>Value</b>를 합성한다. 여기서 실제로 다음 표현으로 운반되는 것은 K가 아니라 V다.", BODY), p("z<sub>그는</sub> = Σⱼ αⱼvⱼ", EQUATION)]
story += [box("결론: ‘그는’의 새 표현 z<sub>그는</sub>는 철수의 Value를 주로 섞어 받는다. 그래서 이후 레이어는 ‘그는’을 문장 속 철수와 연결된 표현으로 처리할 가능성이 높아진다.")]

story += [p("4. 왜 Q, K, V를 굳이 분리하는가", H1)]
why_rows = [
    [p("구성", SMALL), p("분리하지 않으면", SMALL), p("분리의 이점", SMALL)],
    [p("Q와 K", BODY), p("‘무엇을 찾는가’와 ‘내가 무엇으로 검색되는가’가 같은 좌표계에 묶인다.", BODY), p("찾는 기준과 검색 표식을 독립적으로 최적화한다. 비대칭 관계를 표현할 수 있다.", BODY)],
    [p("K와 V", BODY), p("매칭에 좋은 특징만 전달해야 한다.", BODY), p("검색을 위한 압축 표식(K)과, 전달할 풍부한 문맥 정보(V)를 다르게 학습한다.", BODY)],
]
wt = Table(why_rows, colWidths=[30 * mm, 67 * mm, 73 * mm], repeatRows=1)
wt.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#D9E2EC")),
    ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#BCCCDC")),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
]))
story += [wt]

story += [p("5. 검색 엔진 비유 - 도움이 되지만 완전하지는 않다", H1)]
search_rows = [
    [p("Attention", SMALL), p("검색 엔진 비유", SMALL)],
    [p("Query", BODY), p("사용자가 입력한 검색어", BODY)],
    [p("Key", BODY), p("문서의 검색 색인", BODY)],
    [p("attention weight", BODY), p("검색 결과별 관련도", BODY)],
    [p("Value", BODY), p("가져와 요약할 문서 내용", BODY)],
]
qt = Table(search_rows, colWidths=[60 * mm, 110 * mm], repeatRows=1)
qt.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#D9E2EC")),
    ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#BCCCDC")),
    ("LEFTPADDING", (0, 0), (-1, -1), 7), ("RIGHTPADDING", (0, 0), (-1, -1), 7),
    ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
]))
story += [qt, p("차이점도 중요하다. 일반 검색 엔진의 색인은 사람이 설계할 수 있지만, Transformer의 Q/K/V 좌표계는 end-to-end 학습으로 만들어진다. 그래서 모델 내부 벡터의 개별 축에 사람이 읽을 수 있는 고정된 의미가 있다고 가정하면 안 된다.", BODY)]

story += [PageBreak(), p("6. √d<sub>k</sub>로 나누는 이유", H1)]
story += [p("Q와 K의 차원이 커질수록 내적의 크기와 분산도 커진다. 이를 그대로 softmax에 넣으면 가장 큰 점수 하나가 지나치게 지배해 기울기가 작아지고 학습이 불안정해질 수 있다. 따라서 scaled dot-product attention은 다음처럼 나눈다.", BODY), p("Attention(Q, K, V) = softmax(QKᵀ / √d<sub>k</sub>)V", EQUATION)]
story += [box("이 식에서 QKᵀ는 ‘누구를 참고할지’, softmax는 ‘얼마나 참고할지’, 마지막 V 곱은 ‘무슨 정보를 가져올지’를 담당한다.", "#EBF8FF", "#4299E1")]

story += [p("7. 이해 점검 문제", H1)]
checks = [
    "1) Value를 Key와 똑같이 두면 모델의 표현력에서 무엇을 잃는가?",
    "2) ‘그는’의 Query가 ‘철수’의 Key에 큰 내적을 낸다는 말은, 철수와 그의 임베딩이 단순히 유사하다는 말과 어떻게 다른가?",
    "3) attention weight가 0.94인 철수의 Key가 아니라 Value가 최종 합성에 쓰이는 이유는 무엇인가?",
    "4) 한 head가 대명사 관계를 포착했다고 해서 모델이 문법 규칙을 명시적으로 이해한다고 결론 내려도 되는가? 왜 아닌가?",
]
for c in checks:
    story.append(p(c, BODY))

story += [Spacer(1, 4 * mm), box("<b>한 줄 결론</b><br/>Query로 무엇을 찾을지 정하고, Key로 관련 대상을 고르고, Value에서 정보를 가져온다. 다만 이 세 역할은 사람이 부여한 뜻이 아니라 학습을 통해 형성되는 계산상의 역할이다.", "#F0FFF4", "#48BB78")]

doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(OUTPUT)
