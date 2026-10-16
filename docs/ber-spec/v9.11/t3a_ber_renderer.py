"""
T3A Behavioral Evidence Report - reference renderer.

Conformance fixture for T3A-RCE-STD-001 version 9.3, Part F, Sections 49 to 61.

    THE STANDARD GOVERNS. THIS FILE ONLY DEMONSTRATES.

Where this code and Part F disagree, Part F is correct and this file is the
defect. Do not build against this file. Build against Part F, then use the page
this file produces as the target your own output must match.

WHAT THIS FILE ENFORCES, before it draws anything:
    render_input_invalid            a required manifest field missing or empty
    output_mode_invalid             pilot without an authorization, or an
                                    issued or demonstration manifest carrying one
    output_mode_ineligible          the mode and release state combination at
                                    Table 53.1 refuses
    controlled_text_divergence      the register does not match its authorized
                                    digest in the fixture
    evidence_state_unknown          an evidence state outside Table 52.4
    entry_not_approved              an entry identifier not in the library
    entry_use_disposition_refused   an entry served outside its disposition
    claim_package_absent            a represented dimension with no package
    layout_overflow                 reported by the boundary check below

WHAT IT DOES NOT ENFORCE. Part F defines forty result codes. This file
implements the ones above and the boundary check. The rest - placeholder
grammar validation, context dependency matching, difference heading lookup
failure, migration preconditions, persistence refusals - are specified in
Part F and are the implementer's to build. A page this file renders is not
thereby certified against Part F in full.

    Run:      python3 t3a_ber_renderer.py
    Produces: BER-specimen.pdf, and a boundary check on the console.
    Needs:    reportlab, and Liberation Sans Regular, Bold and Italic.

No network access is used or required. Both verification symbols are generated
locally at render time.
"""

"""BER renderer built strictly to T3A-RCE-STD-001 v6.3, Part F."""
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from reportlab.graphics.barcode import qr, createBarcodeDrawing
from reportlab.graphics.shapes import Drawing
from reportlab.graphics import renderPDF
from reportlab.graphics.shapes import String as _String
# Part F, Section 57.5: the font is frozen. Liberation Sans Regular, Bold and
# Italic, all three embedded. A metrically compatible substitute is NOT
# permitted, because the line breaking and the overflow decision depend on
# exact metrics and two builds must reach the same decision.
import os as _os

_FACES = {'LS': 'LiberationSans-Regular.ttf',
          'LSB': 'LiberationSans-Bold.ttf',
          'LSI': 'LiberationSans-Italic.ttf',
          'SERB': 'LiberationSerif-Bold.ttf'}

_SEARCH = [
    _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), 'fonts'),
    '/usr/share/fonts/truetype/liberation',
    '/usr/share/fonts/liberation',
    '/usr/share/fonts/TTF',
    '/usr/local/share/fonts',
    _os.path.expanduser('~/.fonts'),
    _os.path.expanduser('~/Library/Fonts'),
    '/Library/Fonts',
    'C:\\Windows\\Fonts',
]

def _font_dir():
    for d in _SEARCH:
        if all(_os.path.isfile(_os.path.join(d, f)) for f in _FACES.values()):
            return d
    raise SystemExit(
        'FONTS NOT FOUND.\n'
        'This renderer needs all three Liberation Sans faces:\n'
        '  ' + '\n  '.join(sorted(_FACES.values())) + '\n'
        'Put them in a "fonts" folder beside this script, or install the\n'
        'Liberation fonts system wide. On Debian or Ubuntu:\n'
        '  sudo apt-get install fonts-liberation\n'
        'Searched:\n  ' + '\n  '.join(_SEARCH) + '\n'
        'A metrically compatible substitute is not acceptable. Part F freezes\n'
        'the font because the overflow decision depends on exact metrics.')

F = _font_dir() + _os.sep
for _name, _file in _FACES.items():
    pdfmetrics.registerFont(TTFont(_name, F + _file))

# Table 57.3 colors
NAVY=HexColor('#1B3A5C'); NAVYL=HexColor('#2E4E70'); OX=HexColor('#6E1F2A')
GOLD=HexColor('#A8834A'); GT=HexColor('#DFD8C9'); GTL=HexColor('#E9E3D8')
PARCH=HexColor('#FBF9F4'); PARCHL=HexColor('#FEFDFB'); BODY=HexColor('#1A1A1A')
MUTED=HexColor('#5A5A5A'); WHITE=HexColor('#FFFFFF')
W,H=612,792
def Y(y): return H-y           # spec measures y from page top

# ---------------------------------------------------------------------------
# All content is LOADED from the frozen fixture. Nothing is inline.
# Part F, Section 50: the renderer selects and places; it composes nothing.
# ---------------------------------------------------------------------------
import json as _json

FIXTURE = _os.environ.get('T3A_FIXTURE', _os.path.join(
    _os.path.dirname(_os.path.abspath(__file__)), 'fix_specimen.json'))
try:
    PKG = _json.load(open(FIXTURE, encoding='utf-8'))
except FileNotFoundError:
    raise SystemExit(f'FIXTURE NOT FOUND: {FIXTURE}\n'
                     'Part F requires a render manifest. Nothing is rendered without one.\n'
                     'Set T3A_FIXTURE to its path, or place fix_specimen.json beside this file.')

MAN   = PKG['render_manifest']

# ---------------------------------------------------------------------------
# Part F controls enforced before anything is drawn.
# A renderer that reproduces the specimen but accepts an invalid manifest is
# not conformant: it would issue a page the Standard refuses.
# ---------------------------------------------------------------------------
import hashlib as _hl
import datetime as _dt
import re as _re

def refuse(code, detail=''):
    raise SystemExit(f'{code}' + (f': {detail}' if detail else ''))

_REQUIRED = ['report_id','report_version','participant_display_name','participant_status',
             'issue_date','evidence_currency_date','release_state','review_state',
             'correction_state','claim_packages','controlled_text_versions',
             'entry_library_version','presentation_version','output_mode',
             'verification_display_address','verification_reference']

def _validate():
    # Table 51.1: every required field present and non empty.
    for f in _REQUIRED:
        if f not in MAN:
            refuse('render_input_invalid', f'missing field {f}')
        if f != 'claim_packages' and MAN[f] in (None, '', {}):
            refuse('render_input_invalid', f'empty field {f}')
    mode = MAN['output_mode']
    if mode not in ('issued', 'demonstration', 'pilot'):
        refuse('render_input_invalid', f'unknown output_mode {mode}')

    # Table 51.2: the pilot authorization condition.
    auth = MAN.get('pilot_authorization_id')
    if mode == 'pilot' and not auth:
        refuse('output_mode_invalid', 'pilot output without an authorization')
    if mode in ('issued', 'demonstration') and auth:
        refuse('output_mode_invalid', f'{mode} output carrying a pilot authorization')

    # Table 53.1: the output eligibility matrix.
    rel = MAN['release_state']
    allowed = {'released': {'issued','demonstration','pilot'},
               'draft': {'demonstration'}, 'in_correction': {'demonstration'},
               'superseded': {'demonstration'}, 'withdrawn': set()}
    if rel not in allowed:
        refuse('render_input_invalid', f'unknown release_state {rel}')
    if mode not in allowed[rel]:
        refuse('output_mode_ineligible', f'{mode} output from a {rel} version')

    # Table 61.3: the controlled text register must match its authorized digest.
    declared = PKG.get('controlled_text_digest')
    if declared:
        canon = _hl.sha256(_json.dumps(PKG['controlled_texts'], sort_keys=True,
                                       ensure_ascii=False).encode('utf-8')).hexdigest()
        if canon != declared:
            refuse('controlled_text_divergence',
                   'the controlled text register does not match its authorized digest')

    # Table 51.1: dates are absolute, ISO 8601, and are never parsed loosely.
    for f in ('issue_date','evidence_currency_date'):
        v = MAN[f]
        if not (isinstance(v, str) and _re.fullmatch(r'\d{4}-\d{2}-\d{2}', v)):
            refuse('render_input_invalid', f'{f} is not an absolute YYYY-MM-DD date: {v!r}')
        y, m, d = (int(x) for x in v.split('-'))
        try:
            _dt.date(y, m, d)
        except ValueError:
            refuse('render_input_invalid', f'{f} is not a real calendar date: {v}')

    # Section 52: every claim package must resolve.
    for cp in MAN['claim_packages']:
        if cp['evidence_state'] not in PKG['evidence_states']:
            refuse('evidence_state_unknown', cp['evidence_state'])
        ent = PKG['entry_library']['entries'].get(cp['entry_id'])
        if ent is None:
            refuse('entry_not_approved', cp['entry_id'])
        # Table 60.4: the use disposition is enforced at serve time, not noted.
        disp = ent.get('use_disposition', 'build_only')
        if mode == 'issued' and disp != 'production':
            refuse('entry_use_disposition_refused',
                   f"{cp['entry_id']} is {disp} and may not be issued")
        if mode == 'pilot' and disp == 'calibration_restricted':
            refuse('entry_use_disposition_refused',
                   f"{cp['entry_id']} is calibration restricted and may not be served in a pilot")
        # Table 55.1: the heading identifier must resolve in the register.
        hid = cp.get('heading_id', 'T-DIFF-HEADING-001')
        if hid not in PKG['controlled_texts']:
            refuse('difference_heading_absent', hid)

        # Section 55: every difference must name a context this package supports.
        known = {ci['context_instance_id'] for ci in cp['supporting_contexts']}
        for d in cp.get('differences', []):
            cid = d.get('context_instance_id')
            if cid is None:
                refuse('context_dependency_missing',
                       f"difference {d.get('difference_id','?')} names no context instance")
            if cid not in known:
                refuse('context_dependency_missing',
                       f"difference {d.get('difference_id','?')} names {cid}, which this package does not support")
        for ci in cp['supporting_contexts']:
            if 'context_instance_id' not in ci or 'stage_code' not in ci:
                refuse('context_dependency_missing',
                       f"a supporting context of {cp['dimension_id']} is incomplete")
    if not MAN['claim_packages']:
        refuse('claim_package_absent', 'no represented dimension')

_validate()

DIMS  = [(d['dimension_id'], d['full_name']) for d in PKG['dimension_register']['dimensions']]
STAGE = PKG['stage_descriptions']
STATES= PKG['evidence_states']
MAPS  = PKG['state_maps']
FIXED = PKG['fixed_strings']
LIB   = PKG['entry_library']['entries']
PROHIB= PKG['prohibited_vocabulary']
T     = {k: (tuple(v) if isinstance(v, list) else v)
         for k, v in PKG['controlled_texts'].items()}
WORD  = {1: 'one', 2: 'two', 3: 'three', 4: 'four'}
VIS   = {k: tuple(v) for k, v in MAPS['T-VISIBILITY-MAP'].items()}
REVIEW  = MAPS['T-REVIEW-MAP'][MAN['review_state']]
CORR    = MAPS['T-CORRECTION-MAP'][MAN['correction_state']]
FOOTER  = MAPS['T-FOOTER-MAP']
REFMARK = MAPS['T-REFMARK-MAP']
AVAIL_STATE = {'released':'active','withdrawn':'withdrawn',
               'draft':'not_released','in_correction':'not_released',
               'superseded':'not_released'}[MAN['release_state']]

def _month(d):
    y, m, dd = d.split('-')
    names = ['January','February','March','April','May','June','July',
             'August','September','October','November','December']
    return f'{names[int(m)-1]} {int(dd)}, {y}'

def scan_prohibited(clause, dimension_id):
    """Part F, Table 56.1 step 5: scan the RESOLVED clause, whole words, case insensitive."""
    low = clause.lower()
    for term in PROHIB.get(dimension_id, []):
        if _re_boundary(low, term.lower()):
            raise SystemExit(f'prohibited_term_in_resolved_entry: "{term}" in {clause!r}')

def _re_boundary(hay, needle):
    return _re.search(r'(?<!\w)' + _re.escape(needle) + r'(?!\w)', hay) is not None

def wrap(txt,font,size,width,tracking=0.0):
    out=[];line=''
    for w_ in txt.split():
        t=(line+' '+w_).strip()
        if pdfmetrics.stringWidth(t,font,size)+tracking*size*len(t)<=width: line=t
        else: out.append(line); line=w_
    if line: out.append(line)
    return out

def txt(c,x,y,s,font,size,col,tracking=0.0):
    """Single draw path. Character spacing is set explicitly on every call,
    because the PDF text state persists across text blocks and would otherwise
    leak from a letterspaced heading into every line that follows."""
    c.setFillColor(col)
    to=c.beginText(x,Y(y)); to.setFont(font,size)
    to.setCharSpace(tracking*size)
    to.textOut(s)
    c.drawText(to)
    c.setFont(font,size)

def para(c,x,y,s,font,size,col,width,lh=1.15,lead=None,leadfont=None):
    cur=y
    if lead:
        lw=pdfmetrics.stringWidth(lead,leadfont or 'LSB',size)+5.0
        first=wrap(s,font,size,width-lw)
        txt(c,x,cur,lead,leadfont or 'LSB',size,NAVY if lead.endswith('.') or lead.endswith(':') else col)
        txt(c,x+lw,cur,first[0] if first else '',font,size,col)
        rest=wrap(' '.join(s.split()[len(first[0].split()):]) if first else s,font,size,width)
        cur+=size*lh
        for ln in rest: txt(c,x,cur,ln,font,size,col); cur+=size*lh
    else:
        for ln in wrap(s,font,size,width): txt(c,x,cur,ln,font,size,col); cur+=size*lh
    return cur

def render(path, mode=None, represented=None):
    mode = mode or MAN['output_mode']
    if represented is None:
        represented=[{'dim':'D1','contexts':['S1','S2','S4'],'state':'bounded_recurrence',
            'entry':'the participant stated that a specific issue existed and identified what it was',
            'diffs':[('S1','the issue was raised before enquiry.'),('S2','the issue was raised in response to enquiry.')],
            'diff_heading':'TIMING DIFFERED BY SETTING'}]
    c=canvas.Canvas(path,pagesize=(W,H),initialFontName='LS',initialFontSize=8)
    c.setFont('LS',8)   # never leave Helvetica as the initial font
    # 0 photo placeholder — portrait panel with avatar glyph
    PX,PW,PY,PH=496.0,80.0,24.0,76.0
    c.setStrokeColor(GTL); c.setLineWidth(0.5); c.setFillColor(PARCH)
    c.rect(PX,Y(PY+PH),PW,PH,stroke=1,fill=1)
    cx=PX+PW/2.0
    c.setFillColor(GT); c.setStrokeColor(GT)
    c.circle(cx,Y(PY+22),11,stroke=0,fill=1)                 # head
    c.roundRect(cx-20,Y(PY+62),40,24,10,stroke=0,fill=1)     # shoulders
    c.setFillColor(PARCH); c.rect(cx-22,Y(PY+70),44,10,stroke=0,fill=1)
    c.setFont('LSB',5.8); c.setFillColor(MUTED)
    c.drawCentredString(cx,Y(PY+70),FIXED['photo_label'])
    # 1-2 masthead
    _mk = PKG.get('institution_mark')
    if _mk:
        import base64 as _b64, io as _io, hashlib as _h
        _raw = _b64.b64decode(_mk['data_base64'])
        if _h.sha256(_raw).hexdigest() != _mk['sha256']:
            refuse('institution_mark_invalid', 'the embedded mark does not match its digest')
        from reportlab.lib.utils import ImageReader as _IR
        c.drawImage(_IR(_io.BytesIO(_raw)), _mk['x'], Y(_mk['y_bottom']),
                    width=_mk['width_pt'], height=_mk['height_pt'], mask='auto')
        txt(c,61,32,FIXED['institution'],'LSB',9,NAVY,0.08)
    else:
        txt(c,36,32,FIXED['institution'],'LSB',9,NAVY,0.08)
    txt(c,36,62,FIXED['title'],'LSB',22,NAVY)
    para(c,36,88,T['T-PURPOSE-001'],'LS',8,BODY,440)
    # 5 identification band
    c.setStrokeColor(NAVY); c.setFillColor(NAVY); c.rect(36,Y(107),540,3,stroke=0,fill=1)
    c.setFillColor(PARCH); c.setStrokeColor(GTL); c.setLineWidth(0.5)
    c.rect(36,Y(156),540,49,stroke=1,fill=1)
    _vals=[MAN['participant_display_name'], MAN['report_id'],
           _month(MAN['issue_date']), _month(MAN['evidence_currency_date'])]
    for x,lab,val,sz,col in zip([47.2,180.0,309.6,403.6], FIXED['id_labels'], _vals,
                                [13,10.5,10.5,10.5], [NAVY,BODY,BODY,BODY]):
        txt(c,x,116,lab,'LSB',7,NAVYL,0.06); txt(c,x,131,val,'LSB',sz,col)
    txt(c,47.2,146,FIXED['status_label'],'LSB',7,NAVYL,0.06); txt(c,85,146,MAPS['T-STATUS-MAP'][MAN['participant_status']],'LS',8.5,BODY)
    txt(c,180.0,143,'Version '+MAN['report_version'],'LS',7.5,MUTED)
    # 6 verification band
    c.setFillColor(PARCH); c.setStrokeColor(GTL); c.setLineWidth(0.5)
    c.rect(36,Y(230),540,68,stroke=1,fill=1)
    # QR, generated locally, encoding the verification address only
    QS=44.0
    w=qr.QrCodeWidget('https://'+MAN['verification_display_address'])
    b=w.getBounds(); sc=QS/(b[2]-b[0])
    d=Drawing(QS,QS,transform=[sc,0,0,sc,0,0]); d.add(w)
    renderPDF.draw(d,c,46.0,Y(217))
    txt(c,104.8,176,FIXED['verify_heading'],'LSB',7.5,OX,0.04)
    txt(c,104.8,191,MAN['verification_display_address'],'LSI',8.5,NAVY)
    txt(c,104.8,202,T['T-VERIFCAP-001'],'LS',7.5,BODY)
    txt(c,104.8,215,VIS[AVAIL_STATE][0],'LSB',8.5,BODY)
    txt(c,104.8,225,VIS[AVAIL_STATE][1],'LS',7,MUTED)
    # Code 128, generated locally, encoding the verification reference only
    bc=createBarcodeDrawing('Code128',value=MAN['verification_reference'],barHeight=26,barWidth=0.52,humanReadable=False)
    # The barcode object exposes a human readable String that reportlab registers
    # even when it is not drawn, pulling an unembedded Times-Roman into the file.
    # Point it at an embedded face so every font in the output is Liberation Sans.
    for _n in getattr(bc,'contents',[]):
        try: _n.fontName='LS'
        except Exception: pass
    bw=bc.width; renderPDF.draw(bc,c,551.0-bw,Y(203))
    c.setFont('LSB',8); c.setFillColor(BODY); c.drawCentredString(551.0-bw/2,Y(212),MAN['verification_reference'])
    m=REFMARK[mode]
    if m:
        c.setFont('LS',7); c.setFillColor(MUTED); c.drawCentredString(551.0-bw/2,Y(222),m)
    # 7 scope panel
    c.setFillColor(PARCHL); c.setStrokeColor(PARCHL); c.rect(36,Y(268),540,34,stroke=0,fill=1)
    c.setFillColor(GOLD); c.rect(36,Y(268),3,34,stroke=0,fill=1)
    para(c,46.9,243,T['T-SCOPE-001'][1],'LS',7.5,BODY,524,lead=T['T-SCOPE-001'][0],leadfont='LSB')
    # 8 heading
    txt(c,36,282,FIXED['recorded_conduct'],'LSB',9,NAVY,0.04)
    return c

COLS=[(36.0,70.0,7.2),(106.0,103.0,7.8),(209.0,189.0,7.4),(398.0,178.0,7.3)]
HDRS=FIXED['columns']
NAME={d:n for d,n in DIMS}

def measure_row(p):
    """height of a represented row, per the type scale and spacing"""
    h=6.0
    # col1
    h1=18*1.1+len(wrap(NAME[p['dim']],'LS',8,COLS[0][1]-2*COLS[0][2]))*8*1.25
    # col2
    h2=11*1.1+8*1.25+4+len(set(p['contexts']))*10.5
    # col3
    w3=COLS[2][1]-2*COLS[2][2]
    frame=T['T-FRAME-REC'].replace('{context_count}',WORD[len(set(p['contexts']))])
    h3=7.5*1.25+4+len(wrap(frame,'LS',8,w3))*8*1.25+4
    h3+=24+len(wrap(p['entry'][:1].upper()+p['entry'][1:]+'.','SERB',10,w3-28))*10*1.10+8   # entry block padding 8+8
    h3+=len(wrap(T['T-ILLUS-001'],'LSI',7,w3))*7*1.25+4
    h3+=len(wrap(T['T-LIMIT-001'],'LS',7.5,w3))*9.0
    # col4
    w4=COLS[3][1]-2*COLS[3][2]
    h4=7.5*1.25+4
    for s,b in p['diffs']: h4+=len(wrap(f'{s}: {b}','LS',8,w4))*8*1.25
    h4+=9+len(wrap(T['T-DIFF-SEP'],'LS',7.5,w4))*9.0
    return h+max(h1,h2,h3,h4)+6.0

# ---------------------------------------------------------------------------
# Page composition
# ---------------------------------------------------------------------------

# Claim packages come from the manifest. The renderer selects nothing.
P=[]
for cp in MAN['claim_packages']:
    ent=LIB[cp['entry_id']]
    if ent['entry_version']!=cp['entry_version'] or cp['entry_version']!=MAN['entry_library_version']:
        raise SystemExit('entry_not_approved: '+cp['entry_id'])
    clause=ent['composed_text']
    for k,v in cp.get('bound_values',{}).items():
        clause=clause.replace('{'+k+'}', v)
    if '{' in clause or '}' in clause:
        raise SystemExit('placeholder_unresolved: '+clause)
    scan_prohibited(clause, cp['dimension_id'])
    ctx=[]
    for ci in cp['supporting_contexts']:
        if ci['stage_code'] not in ctx: ctx.append(ci['stage_code'])
    ctx.sort(key=lambda sc:['S1','S2','S3','S4'].index(sc))
    byid={ci['context_instance_id']:ci['stage_code'] for ci in cp['supporting_contexts']}
    P.append({'dim':cp['dimension_id'],'contexts':ctx,'entry':clause,
              'state':cp['evidence_state'],
              'diff_heading':T[cp.get('heading_id','T-DIFF-HEADING-001')],
              'diffs':[(byid[d['context_instance_id']], d['body']) for d in cp['differences']]})

c=render('BER-specimen.pdf')
rep=P; repset={p['dim'] for p in rep}; stubs=[d for d,_ in DIMS if d not in repset]
c.setFillColor(NAVY); c.setStrokeColor(NAVY); c.rect(36,Y(310),540,20,stroke=0,fill=1)
c.setStrokeColor(GT); c.setLineWidth(0.5)
for x,w,pad in COLS[1:]: c.line(x,Y(310),x,Y(290))      # separators cross the header band
for (x,w,pad),hd in zip(COLS,HDRS):
    for i,ln in enumerate(wrap(hd,'LSB',7,w-2*pad,0.04)): txt(c,x+pad,298+i*8,ln,'LSB',7,WHITE,0.04)
y=310
TABLE_TOP=290.0
for p in rep:
    h=measure_row(p); x0,w0,p0=COLS[0]
    c.setFillColor(PARCH); c.setStrokeColor(PARCH); c.rect(36,Y(y+h),540,h,stroke=0,fill=1)
    c.setStrokeColor(GT); c.setLineWidth(0.5); c.line(36,Y(y+h),576,Y(y+h))
    for x,w,pad in COLS[1:]: c.line(x,Y(y+h),x,Y(y))
    cy=y+6; txt(c,x0+p0,cy+14,p['dim'],'LSB',18,NAVY); yy=cy+26
    for ln in wrap(NAME[p['dim']],'LS',8,w0-2*p0): txt(c,x0+p0,yy,ln,'LS',8,BODY); yy+=10
    x1,w1,p1=COLS[1]; cx=x1+p1
    for s in p['contexts']: txt(c,cx,cy+10,s,'LSB',11,OX); cx+=pdfmetrics.stringWidth(s,'LSB',11)+6
    n=len(set(p['contexts'])); txt(c,x1+p1,cy+22,f"{n} recorded Stage contexts",'LS',8,BODY); yy=cy+38
    for s in p['contexts']: txt(c,x1+p1,yy,STAGE[s],'LS',7.0,MUTED); yy+=10.5
    x2,w2,p2=COLS[2]; ww=w2-2*p2; yy=cy+8
    txt(c,x2+p2,yy,STATES[p['state']]['display_label'],'LSB',7.5,OX,0.04); yy+=13
    for ln in wrap(T[STATES[p['state']]['frame_text_id']].replace('{context_count}',WORD[n]),'LS',8,ww): txt(c,x2+p2,yy,ln,'LS',8,BODY); yy+=10
    yy+=4
    # Section 52: the entry renders verbatim except that its first character is
    # set in sentence case. No other character is altered.
    _e = p['entry']
    _e = (_e[:1].upper() + _e[1:]) if _e else _e
    el=wrap(_e+'.','SERB',10,ww-28); bh=len(el)*11+24
    # The marker spans the entry text, not the padded block. A marker that runs
    # the full block height reaches above and below the words it marks.
    _mh = len(el)*11 + 4
    _mt = yy + (bh - _mh)/2.0 - 3.0   # sits with the cap height, not the centre
    c.setFillColor(NAVY); c.setStrokeColor(NAVY)
    c.rect(x2+p2, Y(_mt+_mh-4), 2.5, _mh, stroke=0, fill=1)
    ey=yy+12
    for ln in el: txt(c,x2+p2+14,ey,ln,'SERB',10,BODY); ey+=11
    yy+=bh+4                    # clear the entry block's navy edge marker before the note
    for ln in wrap(T['T-ILLUS-001'],'LSI',6.5,ww): txt(c,x2+p2,yy,ln,'LSI',6.5,MUTED); yy+=8
    yy+=6
    for ln in wrap(T['T-LIMIT-001'],'LS',7.5,ww): txt(c,x2+p2,yy,ln,'LS',7.5,MUTED); yy+=9
    x3,w3,p3=COLS[3]; w3b=w3-2*p3; yy=cy+8
    txt(c,x3+p3,yy,p['diff_heading'],'LSB',7.5,OX,0.04); yy+=13
    for s,b in p['diffs']:
        for ln in wrap(f'{s}: {b}','LS',8,w3b): txt(c,x3+p3,yy,ln,'LS',8,BODY); yy+=10
    yy+=9
    for ln in wrap(T['T-DIFF-SEP'],'LS',7.5,w3b): txt(c,x3+p3,yy,ln,'LS',7.5,MUTED); yy+=9
    y+=h
# stub rows, two columns
STRIP_TOP=y
# The strip divides on the table's own column lines, so the separators run
# straight from the header band to the foot of the table. Equal thirds would
# divide at 216.0 and 396.0 and miss the table's 209.0 and 398.0 by a few points,
# which reads as a kink rather than a column.
SX=[36.0, 209.0, 398.0]; SW=[173.0, 189.0, 178.0]; NC=3
rows=(len(stubs)+NC-1)//NC
c.setFillColor(PARCHL); c.setStrokeColor(PARCHL); c.rect(36,Y(y+13),540,13,stroke=0,fill=1)
c.setStrokeColor(GT); c.setLineWidth(0.5); c.line(36,Y(y+13),576,Y(y+13))
txt(c,43.2,y+9,FIXED['strip_heading'],'LSB',7,NAVY,0.04)
txt(c,SX[1]+7.2,y+9,'No recorded conduct for these dimensions is carried here. Their absence is not a conclusion about the participant.','LS',6.8,MUTED)
y+=13
for i in range(rows):
    c.setFillColor(PARCHL); c.setStrokeColor(PARCHL); c.rect(36,Y(y+10),540,10,stroke=0,fill=1)
    c.setStrokeColor(GT); c.setLineWidth(0.5); c.line(36,Y(y+10),576,Y(y+10))
    for k in range(1,NC): c.line(SX[k],Y(y+10),SX[k],Y(y))
    for k in range(NC):
        j=i*NC+k
        if j<len(stubs):
            d=stubs[j]; nm=NAME[d]
            lbl=f"{d}  {nm}"
            while pdfmetrics.stringWidth(lbl,'LS',7.0)>SW[k]-14 and ' ' in nm:
                nm=nm.rsplit(' ',1)[0]; lbl=f"{d}  {nm}"
            txt(c,SX[k]+7.2,y+7.2,lbl,'LS',7.0,MUTED)
    y+=10
TB=y
c.setStrokeColor(GT); c.setLineWidth(0.5)
c.rect(36,Y(TB),540,TB-TABLE_TOP,stroke=1,fill=0)
# the four column separators stop where the three column strip begins
for x,w,pad in COLS[1:]:
    if x in SX[1:]:
        # Continuous from the header band to the foot of the strip, but broken
        # across the strip's heading row: that row is one statement spanning the
        # full width, not three cells, and a divider through it would say otherwise.
        c.line(x,Y(STRIP_TOP),x,Y(TABLE_TOP))
        c.line(x,Y(TB),x,Y(STRIP_TOP+13.0))
    else:
        c.line(x,Y(STRIP_TOP),x,Y(TABLE_TOP))
# tail, flowed
def rule(yy): c.setStrokeColor(GTL); c.setLineWidth(0.5); c.line(36,Y(yy-4),576,Y(yy-4))
y+=11; rule(y); POS={'HOW':y}
y=para(c,36,y+4,T['T-DIFFSHOWN-001'][1],'LS',7.0,BODY,540,lead=T['T-DIFFSHOWN-001'][0])
y+=6; rule(y); POS['REVIEW']=y
txt(c,36,y+4,FIXED['participant_review'],'LSB',7.5,NAVY,0.04)
txt(c,315.9,y+4,FIXED['availability'],'LSB',7.5,NAVY,0.04)
a=para(c,36,y+16,REVIEW+' '+CORR,'LS',7.5,BODY,260)
b=para(c,315.9,y+16,T['T-AVAIL-001'].replace('{d}',_month(MAN['evidence_currency_date'])).replace('{r}',MAN['verification_reference']),'LS',7.5,BODY,260)
# closing blocks, enclosed in one box
BX, BW, PAD = 36.0, 540.0, 8.0
IW = BW - 2*PAD                      # inner text width
IX = BX + PAD
LH = 7.0*1.15

def para_h(body, lead=None):
    """Height of one paragraph at 7.0pt, inner width, matching para()."""
    if lead:
        lw = pdfmetrics.stringWidth(lead,'LSB',7.0)+5.0
        first = wrap(body,'LS',7.0,IW-lw)
        rest = wrap(' '.join(body.split()[len(first[0].split()):]) if first else body,'LS',7.0,IW)
        return (1+len(rest))*LH
    return len(wrap(body,'LS',7.0,IW))*LH

BOX_TOP = max(a,b)+3
h = 10.0 + 2.0 + para_h(T['T-EVNOTE-001'])          # heading + gap + body
for k in ('T-USE-001','T-DISC-001','T-INTEG-001','T-VERIF-001'):
    h += 5.0 + para_h(T[k][1], lead=T[k][0])
BOX_H = h + 2*PAD
c.setFillColor(PARCHL); c.setStrokeColor(GTL); c.setLineWidth(0.5)
c.rect(BX, Y(BOX_TOP+BOX_H), BW, BOX_H, stroke=1, fill=1)

y = BOX_TOP + PAD
txt(c,IX,y+6,FIXED['evidence_note'],'LSB',7.5,OX,0.04)
y = para(c,IX,y+16,T['T-EVNOTE-001'],'LS',7.0,MUTED,IW)
for k in ('T-USE-001','T-DISC-001','T-INTEG-001','T-VERIF-001'):
    y += 5
    y = para(c,IX,y,T[k][1],'LS',7.0,MUTED,IW,lead=T[k][0])
y = BOX_TOP + BOX_H
c.setStrokeColor(GTL); c.setLineWidth(0.5); c.line(36,Y(752),576,Y(752))
txt(c,36,764,FOOTER[MAN['output_mode']],'LSB',7.5,NAVY)
c.setFont('LSB',7.5); c.setFillColor(NAVY); c.drawRightString(576,Y(764),FIXED['page_number'])
c.setFont('LS',6.2); c.setFillColor(MUTED)
c.drawCentredString(306,Y(775),T['T-COLOPHON-001'])

c.save()


# ---------------------------------------------------------------------------
# Boundary check — Part F, acceptance test 69.
# A page can look correct on screen and still carry text past its margin.
# Measure the output; do not inspect it.
# ---------------------------------------------------------------------------
import subprocess as _sp, re as _re

def boundary_check(path='BER-specimen.pdf'):
    try:
        xml=_sp.run(['pdftotext','-bbox','-r','72',path,'-'],
                    capture_output=True,text=True).stdout
    except FileNotFoundError:
        print('  boundary check skipped: pdftotext not installed'); return
    w=[(float(p),float(q),float(r),float(s)) for p,q,r,s,_ in _re.findall(
        r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)</word>',xml)]
    if not w:
        print('  boundary check skipped: no text extracted'); return
    body=[x for x in w if x[3]<750]
    pages=xml.count('<page')
    bad=(sum(1 for x in w if x[0]<35.5)+sum(1 for x in w if x[2]>576.5)
         +sum(1 for x in body if x[3]>744.5))
    print(f'  leftmost text   {min(x[0] for x in w):7.1f}   limit  36.0')
    print(f'  rightmost text  {max(x[2] for x in w):7.1f}   limit 576.0')
    print(f'  lowest body     {max(x[3] for x in body):7.1f}   limit 744.0')
    print(f'  pages           {pages:7d}   limit     1')
    print('  RESULT: PASS' if bad==0 and pages==1 else f'  RESULT: FAIL, {bad} past a boundary')

print()
print(f'Table composed from {TABLE_TOP:.1f} to {TB:.1f}.')
print('Boundary check, Part F acceptance test 69:')
boundary_check()
