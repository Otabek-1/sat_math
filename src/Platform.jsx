import { useEffect, useState } from 'react'
import PaginatedItems, { PaginationControls } from './PaginatedItems.jsx'
import { MathEditor, MathText } from './MathText.jsx'

const staff = ['teacher', 'admin', 'super_admin']
const admin = ['admin', 'super_admin']
const button = 'rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50'
const secondary = 'rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50'
const input = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400'

function Panel({ title, children, action }) {
  return <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-bold text-slate-900">{title}</h2>{action}</div>{children}</section>
}

function Empty({ children = 'Hozircha ma’lumot yo‘q.' }) {
  return <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">{children}</p>
}

function Platform({ auth, api, onLogout, onAuthUpdate }) {
  const [tab, setTab] = useState('home')
  const [data, setData] = useState([])
  const [groups, setGroups] = useState([])
  const [questions, setQuestions] = useState([])
  const [taxonomies, setTaxonomies] = useState([])
  const [summary, setSummary] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [profileLink, setProfileLink] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10
  const pagedData = data.slice((page - 1) * pageSize, page * pageSize)

  const load = async (nextTab = tab) => {
    setError('')
    setBusy(true)
    try {
      let result = []
      if (nextTab === 'home') {
        const [dash, assignmentRows, mockRows] = await Promise.all([api('/api/dashboard'), api('/api/assignments'), api('/api/mocks')])
        setSummary(dash)
        result = [...assignmentRows.map((x) => ({ ...x, _kind: 'assignment' })), ...mockRows.map((x) => ({ ...x, _kind: 'mock' }))]
      }
      if (nextTab === 'groups') result = await api('/api/groups')
      if (nextTab === 'questions') result = await api('/api/questions')
      if (nextTab === 'assignments') result = await api('/api/assignments')
      if (nextTab === 'mocks') result = await api('/api/mocks')
      if (nextTab === 'lessons') result = await api('/api/lessons')
      if (nextTab === 'posts') result = await api('/api/posts')
      if (nextTab === 'resources') result = await api('/api/resources')
      if (nextTab === 'taxonomy') result = await api('/api/taxonomies')
      if (nextTab === 'admin') result = await api(`/api/users?search=${encodeURIComponent(search)}`)
      if (nextTab === 'audit') result = await api('/api/admin/audit')
      if (nextTab === 'settings') result = await api('/api/admin/settings')
      if (nextTab === 'calibration') result = await api('/api/admin/calibrations')
      if (['groups', 'assignments', 'mocks', 'questions', 'lessons', 'resources', 'posts'].includes(nextTab)) {
        const needsQuestionOptions = staff.includes(auth.role) && ['assignments', 'mocks'].includes(nextTab)
        const [groupRows, questionRows] = await Promise.all([
          api('/api/groups'),
          nextTab === 'questions' ? Promise.resolve(result) : needsQuestionOptions ? api('/api/questions') : Promise.resolve([]),
        ])
        setGroups(groupRows)
        setQuestions(questionRows)
      }
      if (['questions', 'assignments', 'mocks'].includes(nextTab)) setTaxonomies(await api('/api/taxonomies'))
      if (nextTab === 'profile') {
        const resultMe = await api('/api/auth/me')
        onAuthUpdate(resultMe.user)
        result = []
      }
      setData(result)
      setPage(1)
    } catch (reason) { setError(reason.message) } finally { setBusy(false) }
  }

  const [search, setSearch] = useState('')
  useEffect(() => {
    const timer = window.setTimeout(() => load(tab), 0)
    return () => window.clearTimeout(timer)
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  const go = (next) => { setNotice(''); setError(''); setPage(1); setTab(next) }
  const act = async (operation, success) => {
    setBusy(true); setError(''); setNotice('')
    try { await operation(); setNotice(success); await load(tab) }
    catch (reason) { setError(reason.message) }
    finally { setBusy(false) }
  }

  const nav = [
    ['home', 'Bosh sahifa'], ['groups', 'Guruhlar'], ['assignments', 'Vazifalar'], ['mocks', 'Mock imtihonlar'], ['lessons', 'Darslar'],
    ...(staff.includes(auth.role) ? [['questions', 'Savollar banki']] : []), ['posts', 'E’lonlar'], ['resources', 'Resurslar'],
    ...(admin.includes(auth.role) ? [['taxonomy', 'Taksonomiya'], ['admin', 'Foydalanuvchilar'], ['audit', 'Audit'], ['calibration', 'IRT kalibratsiya']] : []),
    ...(auth.role === 'super_admin' ? [['settings', 'Ro‘yxat sozlamalari']] : []),
    ['profile', 'Profil'],
  ]

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0"><p className="truncate font-bold text-slate-900">SAT Math</p><p className="truncate text-xs text-slate-500">{auth.first_name || auth.email} · {auth.role}{auth.student_id ? ` · ${auth.student_id}` : ''}</p></div>
          <button onClick={onLogout} className={secondary}>Chiqish</button>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 pb-3">
          {nav.map(([id, label]) => <button key={id} onClick={() => go(id)} className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${tab === id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{label}</button>)}
        </nav>
      </header>
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-6">
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
        {busy && <p className="text-sm text-slate-500">Yuklanmoqda…</p>}
        <PaginationControls total={data.length} page={page} pageSize={pageSize} onPageChange={setPage} />
        {tab === 'home' && <Home data={pagedData} summary={summary} onGo={go} />}
        {tab === 'groups' && <Groups data={pagedData} groups={groups} api={api} auth={auth} act={act} />}
        {tab === 'questions' && <Questions data={pagedData} totalCount={data.length} taxonomies={taxonomies} api={api} act={act} />}
        {tab === 'assignments' && <Assignments data={pagedData} groups={groups} questions={questions} taxonomies={taxonomies} auth={auth} api={api} act={act} />}
        {tab === 'mocks' && <Mocks data={pagedData} groups={groups} questions={questions} taxonomies={taxonomies} auth={auth} api={api} act={act} />}
        {tab === 'lessons' && <Lessons data={pagedData} groups={groups} auth={auth} api={api} act={act} />}
        {tab === 'posts' && <Posts data={pagedData} groups={groups} auth={auth} api={api} act={act} />}
        {tab === 'resources' && <Resources groups={groups} data={pagedData} auth={auth} api={api} act={act} />}
        {tab === 'taxonomy' && <Taxonomy data={pagedData} api={api} act={act} />}
        {tab === 'admin' && <Users data={pagedData} search={search} setSearch={setSearch} api={api} act={act} auth={auth} />}
        {tab === 'audit' && <Audit data={pagedData} />}
        {tab === 'settings' && <Settings data={pagedData} api={api} act={act} />}
        {tab === 'calibration' && <Calibration data={pagedData} api={api} act={act} />}
        {tab === 'profile' && <Profile auth={auth} api={api} act={act} profileLink={profileLink} setProfileLink={setProfileLink} onAuthUpdate={onAuthUpdate} />}
      </div>
    </main>
  )
}

function Home({ data, summary, onGo }) {
  const entries = [['Guruhlar', summary?.groups ?? '—'], ['Savollar', summary?.questions ?? '—'], ['Ochiq vazifalar', summary?.published_assignments ?? '—'], ['Mock urinishlari', summary?.mock_attempts ?? '—']]
  return <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{entries.map(([label, value]) => <div className="rounded-2xl bg-white p-5 shadow-sm" key={label}><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-indigo-700">{value}</p></div>)}</div><Panel title="Siz uchun" action={<button className={secondary} onClick={() => onGo('assignments')}>Vazifalar</button>}>{data.length ? <div className="grid gap-3 md:grid-cols-2">{data.map((row) => <div key={`${row._kind}-${row.id}`} className="rounded-xl border p-4"><p className="text-xs uppercase text-indigo-600">{row._kind === 'mock' ? 'Mock imtihon' : 'Vazifa'}</p><p className="mt-1 font-semibold">{row.title}</p><p className="text-sm text-slate-500">{row.group_name || row.status}</p></div>)}</div> : <Empty>Yangi vazifalar va imtihonlar shu yerda ko‘rinadi.</Empty>}</Panel></div>
}

function Groups({ data, groups, api, auth, act }) {
  const [name, setName] = useState(''); const [description, setDescription] = useState(''); const [selected, setSelected] = useState(''); const [studentId, setStudentId] = useState(''); const [student, setStudent] = useState(null); const [members, setMembers] = useState([]); const [editName, setEditName] = useState(''); const [editDescription, setEditDescription] = useState(''); const [teachers, setTeachers] = useState([]); const [teacherOptions, setTeacherOptions] = useState([]); const [teacherId, setTeacherId] = useState(''); const [createTeacherIds, setCreateTeacherIds] = useState([])
  useEffect(() => { if (!selected) return; let active = true; Promise.all([api(`/api/groups/${selected}/members`), staff.includes(auth.role) ? api(`/api/groups/${selected}/teachers`) : Promise.resolve([])]).then(([m, t]) => { if (active) { setMembers(m); setTeachers(t); const g = groups.find((x) => x.id === selected); setEditName(g?.name || ''); setEditDescription(g?.description || '') } }).catch(() => {}); return () => { active = false } }, [selected, groups, api, auth.role])
  useEffect(() => { if (admin.includes(auth.role)) api('/api/teachers').then(setTeacherOptions).catch(() => setTeacherOptions([])) }, [auth.role, api])
  const create = (e) => { e.preventDefault(); act(() => api('/api/groups', { method: 'POST', body: JSON.stringify({ name, description, teacher_ids: createTeacherIds }) }), 'Guruh yaratildi.') }
  const find = async () => { try { setStudent(await api(`/api/students/search?student_id=${encodeURIComponent(studentId)}&group_id=${selected}`)) } catch (e) { setStudent(null); window.alert(e.message) } }
  const saveGroup = () => act(() => api(`/api/groups/${selected}`, { method: 'PATCH', body: JSON.stringify({ name: editName, description: editDescription }) }), 'Guruh ma’lumoti saqlandi.')
  const addStudent = () => act(async () => { await api(`/api/groups/${selected}/members`, { method: 'POST', body: JSON.stringify({ student_id: student.student_id }) }); setStudent(null); setMembers(await api(`/api/groups/${selected}/members`)) }, 'O‘quvchi guruhga qo‘shildi.')
  const assignTeacher = () => act(async () => { await api(`/api/groups/${selected}/teachers`, { method: 'POST', body: JSON.stringify({ teacher_id: teacherId }) }); setTeachers(await api(`/api/groups/${selected}/teachers`)) }, 'O‘qituvchi guruhga tayinlandi.')
  const removeStudent = (sid) => act(async () => { await api(`/api/groups/${selected}/members/${encodeURIComponent(sid)}`, { method: 'DELETE' }); setMembers(await api(`/api/groups/${selected}/members`)) }, 'O‘quvchi guruhdan chiqarildi.')
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Guruhlar">
        {data.length ? (
          <div className="space-y-2">
            {data.map((g) => (
              <div
                className={`flex items-center justify-between rounded-xl border p-3 ${selected === g.id ? 'border-indigo-400 bg-indigo-50' : ''}`}
                key={g.id}
              >
                <div>
                  <p className="font-semibold">{g.name}</p>
                  <p className="text-xs text-slate-500">{g.student_count} o‘quvchi · </p>
                  <MathText className="text-xs text-slate-500">{g.description}</MathText>
                </div>
                <button className={secondary} onClick={() => setSelected(g.id)}>Tanlash</button>
              </div>
            ))}
          </div>
        ) : (
          <Empty>Guruhlar topilmadi.</Empty>
        )}
      </Panel>

      {auth.role === 'student' && selected && (
        <Panel title="Guruh a’zolari">
          {members.length ? (
            <PaginatedItems
              items={members}
              render={(items) => items.map((m) => (
                <p key={m.id} className="border-b py-2 text-sm">
                  {m.first_name} | {m.student_id}
                </p>
              ))}
            />
          ) : (
            <Empty>Guruhda hozircha o‘quvchi yo‘q.</Empty>
          )}
        </Panel>
      )}

      {staff.includes(auth.role) && (
        <>
          <Panel title="Guruhni boshqarish">
            <div className="space-y-3">
              <select className={input} value={selected} onChange={(e) => setSelected(e.target.value)}>
                <option value="">Guruhni tanlang</option>
                {groups.map((g) => <option value={g.id} key={g.id}>{g.name}</option>)}
              </select>
              {selected && (
                <>
                  <input className={input} value={editName} onChange={(e) => setEditName(e.target.value)} aria-label="Guruh nomi" />
                  <textarea className={input} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} aria-label="Tavsif" />
                  <button className={button} onClick={saveGroup}>Guruhni saqlash</button>
                  <div>
                    <h3 className="mb-2 font-semibold">O‘quvchilar ({members.length})</h3>
                    {members.length ? (
                      <PaginatedItems
                        items={members}
                        render={(items) => items.map((m) => (
                          <div key={m.id} className="flex items-center justify-between border-t py-2 text-sm">
                            <span>{m.first_name} | {m.student_id}</span>
                            <button className="text-red-600" onClick={() => removeStudent(m.student_id)}>Chiqarish</button>
                          </div>
                        ))}
                      />
                    ) : (
                      <Empty>Guruhda o‘quvchi yo‘q.</Empty>
                    )}
                  </div>
                  {admin.includes(auth.role) && (
                    <div>
                      <h3 className="mb-2 font-semibold">O‘qituvchilar</h3>
                      <PaginatedItems
                        items={teachers}
                        pageSize={5}
                        render={(items) => items.map((t) => (
                          <p className="text-sm" key={t.id}>{t.first_name || t.email}</p>
                        ))}
                      />
                      <div className="mt-2 flex gap-2">
                        <select className={input} value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
                          <option value="">O‘qituvchi tanlang</option>
                          {teacherOptions
                            .filter((t) => !teachers.some((assigned) => assigned.id === t.id))
                            .map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.first_name || t.email} · {t.email}
                              </option>
                            ))}
                        </select>
                        <button className={button} disabled={!teacherId} onClick={assignTeacher}>Tayinlash</button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </Panel>

          <Panel title="Yangi guruh">
            <form onSubmit={create} className="space-y-3">
              <input className={input} placeholder="Guruh nomi" required value={name} onChange={(e) => setName(e.target.value)} />
              <MathEditor label="Tavsif" placeholder="Matn yoki LaTeX formulasi" value={description} onChange={setDescription} rows={3} />
              {admin.includes(auth.role) && (
                <fieldset className="max-h-32 space-y-1 overflow-auto rounded-xl border p-2">
                  <legend className="px-1 text-xs">O‘qituvchilar</legend>
                  <PaginatedItems
                    items={teacherOptions}
                    pageSize={10}
                    render={(items) => items.map((t) => (
                      <label className="flex gap-2 text-sm" key={t.id}>
                        <input
                          type="checkbox"
                          checked={createTeacherIds.includes(t.id)}
                          onChange={(e) => setCreateTeacherIds(
                            e.target.checked
                              ? [...createTeacherIds, t.id]
                              : createTeacherIds.filter((id) => id !== t.id),
                          )}
                        />
                        {t.first_name || t.email} · {t.email}
                      </label>
                    ))}
                  />
                </fieldset>
              )}
              <button className={button}>Yaratish</button>
            </form>
          </Panel>

          <Panel title="O‘quvchini guruhga qo‘shish">
            <div className="space-y-3">
              <select className={input} value={selected} onChange={(e) => setSelected(e.target.value)}>
                <option value="">Guruhni tanlang</option>
                {groups.map((g) => <option value={g.id} key={g.id}>{g.name}</option>)}
              </select>
              <div className="flex gap-2">
                <input className={input} placeholder="Student ID" value={studentId} onChange={(e) => setStudentId(e.target.value)} />
                <button className={secondary} onClick={find} disabled={!selected}>Qidirish</button>
              </div>
              {student && (
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="font-medium">{student.first_name} · {student.student_id}</p>
                  <button className={`${button} mt-3`} onClick={addStudent}>Guruhga qo‘shish</button>
                </div>
              )}
            </div>
          </Panel>
        </>
      )}
    </div>
  )
}

function Questions({ data, totalCount, taxonomies, api, act }) {
  const [kind, setKind] = useState('mcq'); const [section, setSection] = useState('math'); const [prompt, setPrompt] = useState(''); const [choices, setChoices] = useState(''); const [answer, setAnswer] = useState(''); const [explanation, setExplanation] = useState(''); const [image, setImage] = useState(''); const [taxonomy, setTaxonomy] = useState(''); const [difficulty, setDifficulty] = useState('medium'); const [editing, setEditing] = useState(null)
  const reset = () => { setEditing(null); setKind('mcq'); setSection('math'); setPrompt(''); setChoices(''); setAnswer(''); setExplanation(''); setImage(''); setTaxonomy(''); setDifficulty('medium') }
  const chooseEdit = (q) => { setEditing(q.id); setKind(q.kind); setSection(q.section); setPrompt(q.prompt); setChoices((q.choices || []).join('\n')); setAnswer(q.answer); setExplanation(q.explanation || ''); setImage(q.image_url || ''); setTaxonomy(q.taxonomy_id || ''); setDifficulty(q.difficulty || 'medium') }
  const save = (e) => { e.preventDefault(); const payload = { kind, section, prompt, choices: kind === 'mcq' ? choices.split('\n').map((x) => x.trim()).filter(Boolean) : [], answer, explanation, image_url: image || null, taxonomy_id: taxonomy || null, difficulty }; act(async () => { await api(editing ? `/api/questions/${editing}` : '/api/questions', { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(payload) }); reset() }, editing ? 'Savol yangilandi.' : 'Savol bankka qo‘shildi.') }
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title={`Savollar (${totalCount})`}>
        {data.length ? (
          <div className="max-h-[70vh] space-y-3 overflow-auto">
            {data.map((q) => (
              <article className="rounded-xl border p-4" key={q.id}>
                <div className="flex justify-between gap-2">
                  <p className="mb-1 text-xs font-semibold uppercase text-indigo-600">
                    {q.section} · {q.kind} · {q.difficulty || 'medium'} · {q.domain || 'Tasniflanmagan'}
                  </p>
                  <button className="text-sm text-indigo-600" onClick={() => chooseEdit(q)}>Tahrirlash</button>
                </div>
                <MathText className="font-medium">{q.prompt}</MathText>
                {q.image_url && <img src={q.image_url} alt="Savol rasmi" className="mt-3 max-h-52 rounded-lg object-contain" />}
                {q.choices?.length > 0 && (
                  <ul className="mt-2 list-inside list-disc text-sm text-slate-600">
                    {q.choices.map((x, index) => <li key={`${index}-${x}`}><MathText>{x}</MathText></li>)}
                  </ul>
                )}
                <div className="mt-2 flex items-start gap-1 text-xs text-slate-500"><span>Javob:</span><MathText>{q.answer}</MathText></div>
                {q.explanation && <MathText className="mt-1 text-sm text-slate-500">{q.explanation}</MathText>}
              </article>
            ))}
          </div>
        ) : <Empty>Savollar banki bo‘sh.</Empty>}
      </Panel>
      <Panel title={editing ? 'Savolni tahrirlash' : 'Savol yaratish'}>
        <form onSubmit={save} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <select className={input} value={kind} onChange={(e) => setKind(e.target.value)}><option value="mcq">MCQ</option><option value="spr">SPR</option></select>
            <select className={input} value={section} onChange={(e) => setSection(e.target.value)}><option value="math">Math</option><option value="reading_writing">Reading/Writing</option></select>
          </div>
          <select className={input} value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            <option value="easy">Easy / Oson</option>
            <option value="medium">Medium / O‘rtacha</option>
            <option value="hard">Hard / Murakkab</option>
          </select>
          <MathEditor required label="Savol matni" placeholder="Masalan: Agar $x=2$ bo‘lsa, $x^2+1$ ni toping." value={prompt} onChange={setPrompt} rows={5} />
          {kind === 'mcq' && <MathEditor required label="Variantlar — har qatorda bittadan" placeholder={'$x=1$\n$x=2$\n$x=3$\n$x=4$'} value={choices} onChange={setChoices} rows={5} />}
          <MathEditor required label="To‘g‘ri javob" placeholder="Masalan: $5$ yoki 5" value={answer} onChange={setAnswer} rows={2} />
          <MathEditor label="Izoh" placeholder="Yechim va tushuntirish" value={explanation} onChange={setExplanation} rows={4} />
          <input className={input} type="url" placeholder="HTTPS rasm manzili (ixtiyoriy)" value={image} onChange={(e) => setImage(e.target.value)} />
          <select className={input} value={taxonomy} onChange={(e) => setTaxonomy(e.target.value)}>
            <option value="">Taksonomiya yo‘q</option>
            {taxonomies.filter((t) => t.section === section).map((t) => <option value={t.id} key={t.id}>{t.domain} / {t.skill}</option>)}
          </select>
          <div className="flex gap-2">
            <button className={button}>{editing ? 'O‘zgarishlarni saqlash' : 'Savolni saqlash'}</button>
            {editing && <button type="button" className={secondary} onClick={reset}>Bekor qilish</button>}
          </div>
        </form>
      </Panel>
    </div>
  )
}

function SelectionRules({ taxonomies, rules, setRules }) {
  const update = (index, patch) => setRules(rules.map((rule, i) => i === index ? { ...rule, ...patch } : rule))
  return (
    <fieldset className="space-y-2 rounded-xl border p-3">
      <legend className="px-1 text-xs font-semibold text-slate-600">Tavsiya qilingan savollarni mavzu/difficulty bo‘yicha random tanlash</legend>
      {rules.map((rule, index) => (
        <div className="grid gap-2 rounded-lg bg-slate-50 p-2 sm:grid-cols-5" key={index}>
          <input className={input} type="number" min="1" max="100" value={rule.count} onChange={(e) => update(index, { count: Number(e.target.value) })} aria-label="Savollar soni" />
          <select className={input} value={rule.section} onChange={(e) => update(index, { section: e.target.value, taxonomy_id: '' })}>
            <option value="math">Math</option><option value="reading_writing">Reading/Writing</option>
          </select>
          <select className={input} value={rule.difficulty} onChange={(e) => update(index, { difficulty: e.target.value })}>
            <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
          </select>
          <select className={input} value={rule.kind || ''} onChange={(e) => update(index, { kind: e.target.value || null })}>
            <option value="">Barcha turi</option><option value="mcq">MCQ</option><option value="spr">SPR</option>
          </select>
          <select className={input} value={rule.taxonomy_id || ''} onChange={(e) => update(index, { taxonomy_id: e.target.value || null })}>
            <option value="">Barcha mavzu</option>
            {taxonomies.filter((t) => t.section === rule.section).map((t) => <option key={t.id} value={t.id}>{t.domain} / {t.skill}</option>)}
          </select>
          <button type="button" className="text-left text-red-600 sm:col-span-5" onClick={() => setRules(rules.filter((_, i) => i !== index))}>Qoidani o‘chirish</button>
        </div>
      ))}
      <button type="button" className={secondary} onClick={() => setRules([...rules, { count: 5, section: 'math', difficulty: 'medium', kind: null, taxonomy_id: null }])}>Mavzu/difficulty qo‘shish</button>
    </fieldset>
  )
}

function Assignments({ data, groups, questions, taxonomies, auth, api, act }) {
  const [group, setGroup] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [deadline, setDeadline] = useState('')
  const [selectedQs, setSelectedQs] = useState([])
  const [selectionRules, setSelectionRules] = useState([])
  const [opened, setOpened] = useState(null)
  const [items, setItems] = useState([])
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const [editing, setEditing] = useState(null)
  const [submissions, setSubmissions] = useState([])

  const create = (e) => {
    e.preventDefault()
    const payload = { group_id: group, title, description, question_ids: selectedQs, selection_rules: selectionRules, deadline: deadline ? new Date(deadline).toISOString() : null }
    act(() => api(editing ? `/api/assignments/${editing}` : '/api/assignments', { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(payload) }), editing ? 'Vazifa saqlandi.' : 'Qoralama vazifa yaratildi.')
  }
  const editAssignment = (a) => {
    setEditing(a.id); setGroup(a.group_id); setTitle(a.title); setDescription(a.description)
    setDeadline(a.deadline ? new Date(a.deadline).toISOString().slice(0,16) : '')
    setSelectedQs(a.question_ids || []); setSelectionRules(a.selection_rules || [])
  }
  const review = (id) => act(async () => setSubmissions(await api(`/api/assignments/${id}/submissions`)), 'Topshiriqlar yuklandi.')
  const open = async (item) => {
    try { setOpened(item); setItems(await api(`/api/assignments/${item.id}/questions`)); setAnswers({}); setResult(null) }
    catch (e) { setResult({ error: e.message }) }
  }
  const submit = () => act(async () => setResult(await api(`/api/assignments/${opened.id}/submit`, { method: 'POST', body: JSON.stringify({ answers }) })), 'Vazifa topshirildi.')

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Vazifalar">
        {data.length ? (
          <div className="space-y-3">
            {data.map((a) => (
              <article className="rounded-xl border p-4" key={a.id}>
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="font-semibold">{a.title}</p>
                    <p className="text-sm text-slate-500">{a.group_name} · {a.status} {a.deadline ? `· ${new Date(a.deadline).toLocaleString()}` : ''}</p>
                    <p className="text-xs text-slate-500">Topshiriqlar: {a.submission_count ?? 0}</p>
                    {a.my_submission && <p className="text-xs font-medium text-emerald-700">Sizning natijangiz: {a.my_submission.raw_score}/{a.my_submission.total_questions}</p>}
                  </div>
                  {auth.role === 'student' ? (
                    <button className={button} onClick={() => open(a)}>Ochish</button>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {a.status === 'draft' && <>
                        <button className={secondary} onClick={() => editAssignment(a)}>Tahrirlash</button>
                        <button className={button} onClick={() => act(() => api(`/api/assignments/${a.id}/publish`, { method: 'POST' }), 'Vazifa e’lon qilindi.')}>E’lon qilish</button>
                      </>}
                      <button className={secondary} onClick={() => review(a.id)}>Natijalar</button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : <Empty>Vazifalar yo‘q.</Empty>}
        {staff.includes(auth.role) && submissions.length > 0 && (
          <div className="mt-4 border-t pt-3">
            <h3 className="mb-2 font-semibold">Topshiriqlar natijalari</h3>
            <PaginatedItems items={submissions} render={(items) => items.map((s) => (
              <p key={s.id} className="border-b py-2 text-sm">{s.first_name} | {s.student_id} | {s.raw_score}/{s.total_questions} | {new Date(s.submitted_at).toLocaleString()}</p>
            ))} />
          </div>
        )}
      </Panel>
      {staff.includes(auth.role) ? (
        <Panel title={editing ? 'Qoralama vazifani tahrirlash' : 'Qoralama vazifa'}>
          <form onSubmit={create} className="space-y-3">
            <select className={input} required value={group} onChange={(e) => setGroup(e.target.value)}>
              <option value="">Guruh</option>{groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <input className={input} required placeholder="Nomi" value={title} onChange={(e) => setTitle(e.target.value)} />
            <MathEditor label="Tavsif" placeholder="Matn yoki LaTeX formulasi" value={description} onChange={setDescription} rows={3} />
            <input className={input} type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            <QuestionPicker questions={questions} selected={selectedQs} setSelected={setSelectedQs} />
            <SelectionRules taxonomies={taxonomies} rules={selectionRules} setRules={setSelectionRules} />
            <div className="flex gap-2">
              <button className={button}>Qoralama saqlash</button>
              {editing && <button className={secondary} type="button" onClick={() => { setEditing(null); setTitle(''); setDescription(''); setGroup(''); setSelectedQs([]); setSelectionRules([]); setDeadline('') }}>Bekor qilish</button>}
            </div>
          </form>
        </Panel>
      ) : opened && (
        <Panel title={opened.title}>
          <div className="space-y-4">
            <PaginatedItems items={items} pageSize={5} render={(pageItems, start) => pageItems.map((q, index) => <QuestionAnswer key={q.id} q={q} index={start + index} answers={answers} setAnswers={setAnswers} />)} />
            {result?.error && <p className="text-red-600">{result.error}</p>}
            {result?.raw_score !== undefined && <p className="rounded-xl bg-emerald-50 p-3">Natija: {result.raw_score}/{result.total_questions} · Math {result.raw_math}, Reading/Writing {result.raw_reading_writing}</p>}
            <button onClick={submit} className={button}>Javoblarni topshirish</button>
          </div>
        </Panel>
      )}
    </div>
  )
}

function QuestionPicker({ questions, selected, setSelected }) {
  return <fieldset className="rounded-xl border p-3"><legend className="px-1 text-xs font-semibold text-slate-600">Savollar</legend>{questions.length ? <PaginatedItems items={questions} pageSize={5} render={(items) => <div className="space-y-2">{items.map((q) => <label key={q.id} className="flex items-start gap-2 text-sm"><input type="checkbox" checked={selected.includes(q.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, q.id] : selected.filter((id) => id !== q.id))} /><span><MathText>{q.prompt}</MathText><small className="text-slate-400">{q.section}/{q.kind}</small></span></label>)}</div>} /> : <p className="text-xs text-slate-500">Avval savol yarating.</p>}</fieldset>
}

function QuestionAnswer({ q, index, answers, setAnswers }) {
  return <article className="rounded-xl border p-3"><MathText className="font-medium">{`${index + 1}. ${q.prompt}`}</MathText>{q.image_url && <img src={q.image_url} alt="Savol rasmi" className="mt-2 max-h-48 object-contain" onError={(e) => { e.currentTarget.style.display = 'none' }} />}{q.kind === 'mcq' ? <div className="mt-2 space-y-1">{q.choices.map((choice, choiceIndex) => <label key={`${choiceIndex}-${choice}`} className="flex gap-2 text-sm"><input type="radio" name={q.id} value={choice} checked={answers[q.id] === choice} onChange={() => setAnswers({ ...answers, [q.id]: choice })} /><MathText>{choice}</MathText></label>)}</div> : <input className={`${input} mt-2`} value={answers[q.id] || ''} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} placeholder="Javob" />}</article>
}

function Mocks({ data, groups, questions, taxonomies, auth, api, act }) {
  const [title, setTitle] = useState(''); const [selectedQs, setSelectedQs] = useState([]); const [selectionRules, setSelectionRules] = useState([]); const [selectedGroups, setSelectedGroups] = useState([]); const [studentIds, setStudentIds] = useState(''); const [deadline, setDeadline] = useState(''); const [opened, setOpened] = useState(null); const [items, setItems] = useState([]); const [answers, setAnswers] = useState({}); const [result, setResult] = useState(null); const [newDeadline, setNewDeadline] = useState(''); const [editing, setEditing] = useState(null); const [attempts, setAttempts] = useState([])
  const create = (e) => { e.preventDefault(); const payload = { title, question_ids: selectedQs, selection_rules: selectionRules, group_ids: selectedGroups, student_ids: studentIds.split(/[\s,]+/).filter(Boolean), deadline: deadline ? new Date(deadline).toISOString() : null }; act(() => api(editing ? `/api/mocks/${editing}` : '/api/mocks', { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(payload) }), editing ? 'Mock sozlamalari saqlandi.' : 'Qoralama mock yaratildi.') }
  const editMock = (m) => { setEditing(m.id); setTitle(m.title); setSelectedQs(m.question_ids || []); setSelectionRules(m.selection_rules || []); setSelectedGroups(m.group_ids || []); setStudentIds((m.student_ids || []).join('\n')); setDeadline(m.deadline ? new Date(m.deadline).toISOString().slice(0,16) : '') }
  const review = (id) => act(async () => setAttempts(await api(`/api/mocks/${id}/results`)), 'Mock natijalari yuklandi.')
  const start = async (m) => { try { setOpened(m); setItems(await api(`/api/mocks/${m.id}/questions`)); setAnswers({}); setResult(null) } catch (e) { setResult({ error: e.message }) } }
  const submit = () => act(async () => setResult(await api(`/api/mocks/${opened.id}/attempts`, { method: 'POST', body: JSON.stringify({ answers }) })), 'Mock natijasi saqlandi.')
  return <div className="grid gap-4 lg:grid-cols-2"><Panel title="Mock imtihonlar">{data.length ? <div className="space-y-3">{data.map((m) => <article className="rounded-xl border p-4" key={m.id}><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-semibold">{m.title}</p><p className="text-sm text-slate-500">{m.status} · Urinishlar: {m.attempt_count ?? '—'}{m.deadline ? ` · ${new Date(m.deadline).toLocaleString()}` : ''}</p>{m.my_latest_attempt && <p className="text-xs text-emerald-700">Oxirgi raw natija: Math {m.my_latest_attempt.raw_math}, Reading/Writing {m.my_latest_attempt.raw_reading_writing}</p>}</div>{auth.role === 'student' ? <button className={button} onClick={() => start(m)}>Boshlash</button> : <div className="flex flex-wrap gap-2">{m.status === 'draft' && <><button className={secondary} onClick={() => editMock(m)}>Tahrirlash</button><button className={button} onClick={() => act(() => api(`/api/mocks/${m.id}/open`, { method: 'POST' }), 'Mock ochildi.')}>Ochish</button></>}{m.status === 'open' && <button className={secondary} onClick={() => act(() => api(`/api/mocks/${m.id}/close`, { method: 'POST' }), 'Mock yopildi.')}>Yopish</button>}{m.status === 'closed' && <><input type="datetime-local" className={input} value={newDeadline} onChange={(e) => setNewDeadline(e.target.value)} /><button className={button} disabled={!newDeadline} onClick={() => act(() => api(`/api/mocks/${m.id}/reopen`, { method: 'POST', body: JSON.stringify({ deadline: new Date(newDeadline).toISOString() }) }), 'Mock yangi muddat bilan ochildi.')}>Qayta ochish</button></>}{<button className={secondary} onClick={() => review(m.id)}>Natijalar</button>}</div>}</div></article>)}</div> : <Empty>Mock imtihonlar yo‘q.</Empty>}{attempts.length > 0 && <div className="mt-4 border-t pt-3"><h3 className="mb-2 font-semibold">Urinishlar</h3><PaginatedItems items={attempts} render={(items) => items.map((a) => <p className="border-b py-2 text-sm" key={a.id}>{a.first_name} | {a.student_id} | urinish {a.attempt_number}: Math {a.raw_math}, Reading/Writing {a.raw_reading_writing}</p>)} /></div>}</Panel>{staff.includes(auth.role) ? <Panel title={editing ? 'Mock qoralamasini tahrirlash' : 'Mock yaratish'}><form onSubmit={create} className="space-y-3"><input className={input} required placeholder="Imtihon nomi" value={title} onChange={(e) => setTitle(e.target.value)} /><input className={input} type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)}   /><QuestionPicker questions={questions} selected={selectedQs} setSelected={setSelectedQs} /><SelectionRules taxonomies={taxonomies} rules={selectionRules} setRules={setSelectionRules} /><fieldset className="space-y-2"><legend className="text-sm font-semibold">Guruhlar</legend><PaginatedItems items={groups} pageSize={5} render={(items) => items.map((g) => <label key={g.id} className="flex gap-2 text-sm"><input type="checkbox" checked={selectedGroups.includes(g.id)} onChange={(e) => setSelectedGroups(e.target.checked ? [...selectedGroups, g.id] : selectedGroups.filter((id) => id !== g.id))} />{g.name}</label>)} /></fieldset><textarea className={input} placeholder="Alohida o‘quvchilarning ichki user ID’lari (vergul yoki qator bilan)" value={studentIds} onChange={(e) => setStudentIds(e.target.value)} /><div className="flex gap-2"><button className={button}>{editing ? 'Sozlamalarni saqlash' : 'Qoralama saqlash'}</button>{editing && <button className={secondary} type="button" onClick={() => { setEditing(null);setTitle('');setSelectedQs([]);setSelectedGroups([]);  setStudentIds('');setSelectionRules([]);setDeadline('') }}>Bekor qilish</button>}</div></form></Panel> : opened && <Panel title={opened.title}><div className="space-y-4"><PaginatedItems items={items} pageSize={5} render={(pageItems, start) => pageItems.map((q, i) => <QuestionAnswer key={q.id} q={q} index={start + i} answers={answers} setAnswers={setAnswers} />)} />{result?.error && <p className="text-red-600">{result.error}</p>}{result?.score_label && <div className="rounded-xl bg-emerald-50 p-3">Raw score: Math {result.raw_math}, Reading/Writing {result.raw_reading_writing}. {result.score_label}</div>}<button onClick={submit} className={button}>Imtihonni topshirish</button></div></Panel>}</div>
}

function Lessons({ data, groups, auth, api, act }) {
  const [title, setTitle] = useState(''); const [group, setGroup] = useState(''); const [content, setContent] = useState(''); const [editing, setEditing] = useState(null)
  const create = (e) => { e.preventDefault(); act(() => api(editing ? `/api/lessons/${editing}` : '/api/lessons', { method: editing ? 'PATCH' : 'POST', body: JSON.stringify({ title, group_id: group, content }) }), editing ? 'Dars qoralamasi saqlandi.' : 'Qoralama dars yaratildi.') }
  return <div className="grid gap-4 lg:grid-cols-2"><Panel title="Darslar">{data.length ? <div className="space-y-3">{data.map((l) => <article className="rounded-xl border p-4" key={l.id}><div className="flex justify-between gap-3"><div><p className="font-semibold">{l.title}</p><p className="text-sm text-slate-500">{l.group_name} · {l.status}</p><MathText className="mt-2 text-sm">{l.content}</MathText></div>{staff.includes(auth.role) && l.status === 'draft' && <div className="flex gap-2"><button className={secondary} onClick={() => { setEditing(l.id);setTitle(l.title);setGroup(l.group_id);setContent(l.content) }}>Tahrirlash</button><button className={button} onClick={() => act(() => api(`/api/lessons/${l.id}/publish`, { method: 'POST' }), 'Dars o‘quvchilarga ochildi.')}>E’lon</button></div>}</div></article>)}</div> : <Empty>Darslar yo‘q.</Empty>}</Panel>{staff.includes(auth.role) && <Panel title={editing ? 'Dars qoralamasini tahrirlash' : 'Dars yaratish'}><form className="space-y-3" onSubmit={create}><select className={input} required value={group} onChange={(e) => setGroup(e.target.value)}><option value="">Guruh</option>{groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select><input className={input} required placeholder="Dars nomi" value={title} onChange={(e) => setTitle(e.target.value)} /><MathEditor label="Dars mazmuni" rows={8} placeholder="Dars matni va LaTeX formulalari" value={content} onChange={setContent} /><div className="flex gap-2"><button className={button}>{editing ? 'Saqlash' : 'Qoralama saqlash'}</button>{editing && <button type="button" className={secondary} onClick={() => { setEditing(null);setTitle('');setContent('');setGroup('') }}>Bekor qilish</button>}</div></form></Panel>}</div>
}

function Posts({ data, groups, auth, api, act }) {
  const [group, setGroup] = useState(''); const [body, setBody] = useState('')
  const create = (e) => { e.preventDefault(); act(() => api('/api/posts', { method: 'POST', body: JSON.stringify({ group_id: group, body }) }), 'E’lon joylandi.') }
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Guruh e’lonlari">
        {data.length ? data.map((p) => (
          <article className="mb-3 rounded-xl border p-4" key={p.id}>
            <p className="text-xs text-slate-500">{p.group_name} · {new Date(p.created_at).toLocaleString()}</p>
            <MathText className="mt-2">{p.body}</MathText>
          </article>
        )) : <Empty>E’lonlar yo‘q.</Empty>}
      </Panel>
      {staff.includes(auth.role) && (
        <Panel title="E’lon yozish">
          <form className="space-y-3" onSubmit={create}>
            <select className={input} required value={group} onChange={(e) => setGroup(e.target.value)}>
              <option value="">Guruh</option>{groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <MathEditor required label="E’lon matni" placeholder="Matn va kerak bo'lsa LaTeX formulasi" value={body} onChange={setBody} rows={5} />
            <button className={button}>E’lon qilish</button>
          </form>
        </Panel>
      )}
    </div>
  )
}

function Resources({ groups, data, auth, api, act }) {
  const [file, setFile] = useState(null); const [targetType, setTargetType] = useState('group'); const [targetId, setTargetId] = useState(''); const [resource, setResource] = useState(null); const [targets, setTargets] = useState([])
  useEffect(() => {
    if (targetType === 'group') return
    const endpoint = { assignment: '/api/assignments', lesson: '/api/lessons', post: '/api/posts' }[targetType]
    let current = true
    api(endpoint).then((items) => { if (current) setTargets(items) }).catch(() => { if (current) setTargets([]) })
    return () => { current = false }
  }, [targetType, groups, api])
  const targetOptions = targetType === 'group' ? groups : targets
  const upload = async () => { if (!file) return; const form = new FormData(); form.append('file', file); const item = await api('/api/resources', { method: 'POST', body: form }); setResource(item) }
  const attach = () => act(() => api(`/api/resources/${resource.id}/link`, { method: 'POST', body: JSON.stringify({ target_type: targetType, target_id: targetId }) }), 'Resurs obyektga biriktirildi.')
  const download = async () => { try { const response = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '' : 'https://sat-math-server.onrender.com')}/api/resources/${resource.id}/download`, { headers: { Authorization: `Bearer ${localStorage.getItem('session_token')}` } }); if (!response.ok) throw new Error('Faylga kirish rad etildi'); const blob = await response.blob(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = resource.filename; a.click(); URL.revokeObjectURL(url) } catch (e) { window.alert(e.message) } }
  return <div className="grid gap-4 lg:grid-cols-2"><Panel title="Mening va guruh resurslari">{data.length ? <div className="space-y-2">{data.map((r) => <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border p-3"><div><p className="font-medium">{r.filename}</p><p className="text-xs text-slate-500">{Math.ceil(r.size_bytes / 1024)} KB · {new Date(r.created_at).toLocaleDateString()}</p></div><button className={secondary} onClick={async () => { try { const base=import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '' : 'https://sat-math-server.onrender.com'); const response=await fetch(`${base}/api/resources/${r.id}/download`,{headers:{Authorization:`Bearer ${localStorage.getItem('session_token')}`}}); if(!response.ok) throw new Error('Faylga kirish rad etildi'); const url=URL.createObjectURL(await response.blob()); const a=document.createElement('a'); a.href=url; a.download=r.filename; a.click(); URL.revokeObjectURL(url) } catch(e) { window.alert(e.message) } }}>Yuklab olish</button></div>)}</div> : <Empty>Ko‘rinadigan resurslar yo‘q.</Empty>}</Panel>{staff.includes(auth.role) && <Panel title="Himoyalangan fayl yuklash"><div className="space-y-3"><input type="file" accept="application/pdf,image/png,image/jpeg,image/webp,text/plain" onChange={(e) => setFile(e.target.files?.[0] || null)} /><button disabled={!file} className={button} onClick={() => act(upload, 'Fayl himoyalangan saqlash joyiga yuklandi.')}>Yuklash</button>{resource && <div className="space-y-2 rounded-xl bg-slate-50 p-3"><p className="text-sm">{resource.filename} · {Math.ceil(resource.size_bytes / 1024)} KB</p><button className={secondary} onClick={download}>Himoyalangan yuklab olish</button><select className={input} value={targetType} onChange={(e) => { setTargetType(e.target.value); setTargetId('') }}><option value="group">Guruh</option><option value="assignment">Vazifa</option><option value="lesson">Dars</option><option value="post">E’lon</option></select><div className="flex gap-2"><select className={input} value={targetId} onChange={(e) => setTargetId(e.target.value)}><option value="">Obyektni tanlang</option>{targetOptions.map((x) => <option key={x.id} value={x.id}>{x.name || x.title || x.body?.slice(0,40)}</option>)}</select><button className={button} onClick={attach} disabled={!targetId}>Biriktirish</button></div></div>}</div></Panel>}</div>
}

function Taxonomy({ data, api, act }) {
  const [section, setSection] = useState('math'); const [domain, setDomain] = useState(''); const [skill, setSkill] = useState(''); const [editing, setEditing] = useState(null)
  const save = (e) => { e.preventDefault(); act(() => api(editing ? `/api/taxonomies/${editing}` : '/api/taxonomies', { method: editing ? 'PATCH' : 'POST', body: JSON.stringify({ section, domain, skill }) }), editing ? 'Taksonomiya yangilandi.' : 'Taksonomiya qo‘shildi.') }
  return <div className="grid gap-4 lg:grid-cols-2"><Panel title="Tasniflar">{data.length ? <div className="space-y-2">{data.map((t) => <div key={t.id} className="flex items-center justify-between rounded-xl border p-3"><span><b>{t.section}</b> · {t.domain} / {t.skill}</span><div className="flex gap-2"><button className="text-indigo-600" onClick={() => { setEditing(t.id);setSection(t.section);setDomain(t.domain);setSkill(t.skill) }}>Tahrirlash</button><button className="text-red-600" onClick={() => act(() => api(`/api/taxonomies/${t.id}`, { method: 'DELETE' }), 'Taksonomiya o‘chirildi.')}>O‘chirish</button></div></div>)}</div> : <Empty>Taksonomiya bo‘sh.</Empty>}</Panel><Panel title={editing ? 'Tasnifni tahrirlash' : 'Tasnif qo‘shish'}><form className="space-y-3" onSubmit={save}><select className={input} value={section} onChange={(e) => setSection(e.target.value)}><option value="math">Math</option><option value="reading_writing">Reading/Writing</option></select><input className={input} required placeholder="Domain" value={domain} onChange={(e) => setDomain(e.target.value)} /><input className={input} required placeholder="Skill" value={skill} onChange={(e) => setSkill(e.target.value)} /><div className="flex gap-2"><button className={button}>Saqlash</button>{editing && <button type="button" className={secondary} onClick={() => { setEditing(null);setDomain('');setSkill('') }}>Bekor qilish</button>}</div></form></Panel></div>
}

function Users({ data, search, setSearch, api, act, auth }) {
  const runSearch = (e) => { e.preventDefault(); act(() => api(`/api/users?search=${encodeURIComponent(search)}`), 'Qidiruv yangilandi.') }
  return <Panel title="Foydalanuvchilar"><form className="mb-4 flex gap-2" onSubmit={runSearch}><input className={input} placeholder="ID, email, Telegram ID, Student ID" value={search} onChange={(e) => setSearch(e.target.value)} /><button className={button}>Qidirish</button></form>{data.length ? <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-2">Foydalanuvchi</th><th className="p-2">Identifikator</th><th className="p-2">Rol</th><th className="p-2">Holat</th></tr></thead><tbody>{data.map((u) => <UserRow key={u.id} user={u} api={api} act={act} canGrantSuper={auth.role === 'super_admin'} />)}</tbody></table></div> : <Empty>Foydalanuvchi topilmadi.</Empty>}</Panel>
}

function UserRow({ user, api, act, canGrantSuper }) {
  const [role, setRole] = useState(user.role)
  return <tr className="border-b"><td className="p-2">{user.first_name || '—'}<div className="text-xs text-slate-500">{user.email || 'Email yo‘q'}</div></td><td className="p-2 text-xs">{user.student_id || user.telegram_id || user.id}</td><td className="p-2"><select className="rounded-lg border p-2" value={role} onChange={(e) => setRole(e.target.value)}><option value="student">Student</option><option value="teacher">Teacher</option><option value="admin">Admin</option>{canGrantSuper && <option value="super_admin">Super Admin</option>}</select><button className="ml-2 text-indigo-600" onClick={() => act(() => api(`/api/users/${user.id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }), 'Rol yangilandi.')}>Saqlash</button></td><td className="p-2"><button className={user.is_active ? secondary : button} onClick={() => act(() => api(`/api/users/${user.id}/active`, { method: 'PATCH', body: JSON.stringify({ is_active: !user.is_active }) }), 'Hisob holati yangilandi.')}>{user.is_active ? 'Faol' : 'To‘xtatilgan'} · almashtirish</button></td></tr>
}

function Audit({ data }) {
  return <Panel title="Audit log">{data.length ? <div className="space-y-2">{data.map((x) => <article className="rounded-xl border p-3 text-sm" key={x.id}><div className="flex flex-wrap justify-between gap-2"><b>{x.action}</b><time className="text-slate-500">{new Date(x.created_at).toLocaleString()}</time></div><p className="text-slate-600">{x.actor_email || x.actor_role || 'Tizim'} · {x.target_type} {x.target_id || ''}</p><pre className="mt-1 overflow-auto text-xs text-slate-500">{JSON.stringify(x.metadata)}</pre></article>)}</div> : <Empty>Audit yozuvlari yo‘q.</Empty>}</Panel>
}

function Settings({ data, api, act }) {
  const setting = data.find((x) => x.key === 'registration_enabled')
  const enabled = setting?.value === true
  return <Panel title="Ro‘yxatdan o‘tish"><p className="mb-4 text-sm">Yangi foydalanuvchilar ro‘yxatdan o‘tishi: <b>{enabled ? 'Ochiq' : 'Yopiq'}</b></p><button className={button} onClick={() => act(() => api('/api/admin/settings/registration_enabled', { method: 'PATCH', body: JSON.stringify({ value: !enabled }) }), 'Sozlama saqlandi.')}>{enabled ? 'Ro‘yxatdan o‘tishni yopish' : 'Ro‘yxatdan o‘tishni ochish'}</button></Panel>
}

function Calibration({ data, api, act }) {
  const [name, setName] = useState(''); const [matrix, setMatrix] = useState('[{"Q1":1,"Q2":0},{"Q1":0,"Q2":1},{"Q1":1,"Q2":1},{"Q1":0,"Q2":0},{"Q1":1,"Q2":0}]')
  const create = (e) => { e.preventDefault(); let responses; try { responses = JSON.parse(matrix) } catch { return } act(() => api('/api/admin/calibrations', { method: 'POST', body: JSON.stringify({ name, responses }) }), 'Eksperimental IRT kalibratsiyasi saqlandi.') }
  return <div className="grid gap-4 lg:grid-cols-2"><Panel title="Kalibratsiyalar">{data.length ? data.map((x) => <article key={x.id} className="mb-3 rounded-xl border p-3"><b>{x.name}</b><p className="text-xs text-slate-500">{x.label} · {x.status}</p><pre className="mt-2 overflow-auto text-xs">{JSON.stringify(x.calibration, null, 2)}</pre></article>) : <Empty>Kalibratsiya ma’lumotlari mavjud emas.</Empty>}</Panel><Panel title="Javob matritsasidan kalibratsiya"><form onSubmit={create} className="space-y-3"><input className={input} required placeholder="Nom" value={name} onChange={(e) => setName(e.target.value)} /><textarea className={input} rows="10" value={matrix} onChange={(e) => setMatrix(e.target.value)} /><p className="text-xs text-slate-500">Kamida 5 respondent; savollar ustun, 1=to‘g‘ri, 0=noto‘g‘ri, null=bo‘sh. Hisoblangan qiymatlar eksperimental item difficulty bahosi, rasmiy SAT balli emas.</p><button className={button}>Hisoblash</button></form></Panel></div>
}

function Profile({ auth, api, act, profileLink, setProfileLink, onAuthUpdate }) {
  const connect = () => act(async () => { const result = await api('/api/account/telegram/link', { method: 'POST' }); setProfileLink(result.url) }, 'Telegram ulash havolasi tayyor.')
  const disconnect = () => act(async () => { await api('/api/account/telegram/link', { method: 'DELETE' }); const result = await api('/api/auth/me'); onAuthUpdate(result.user) }, 'Telegram uzildi.')
  const refresh = () => act(async () => { const result = await api('/api/auth/me'); onAuthUpdate(result.user) }, 'Profil yangilandi.')
  return <Panel title="Profil va hisob"><div className="space-y-2 text-sm"><p><b>Ism:</b> {auth.first_name || '—'}</p><p><b>Email:</b> {auth.email || 'Sozlanmagan'}</p><p><b>Student ID:</b> {auth.student_id || '—'}</p><p><b>Telegram:</b> {auth.telegram_id ? `Ulangan (${auth.telegram_id})` : 'Ulanmagan'}</p><div className="flex flex-wrap gap-2 pt-2">{auth.telegram_id ? <button className={secondary} onClick={disconnect}>Telegramni uzish</button> : <button className={button} onClick={connect}>Telegramni ulash</button>}<button className={secondary} onClick={refresh}>Yangilash</button></div>{profileLink && <a className="inline-block font-semibold text-indigo-600" target="_blank" rel="noreferrer" href={profileLink}>Botda ulashni tugatish</a>}</div></Panel>
}

export default Platform
