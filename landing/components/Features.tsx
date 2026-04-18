const features = [
  {
    emoji: "📅",
    title: "Управление встречами",
    description:
      "Создавайте публичные и персональные встречи, приглашайте участников по ссылке или email, отслеживайте статус каждого.",
  },
  {
    emoji: "💰",
    title: "Совместные сборы",
    description:
      "Укажите целевую сумму — приложение автоматически разделит её между участниками и покажет кто уже скинулся.",
  },
  {
    emoji: "📊",
    title: "Опросы и голосования",
    description:
      "Задайте вопрос и получите мнение всех участников до начала встречи: куда идём, что готовить, во сколько собираемся.",
  },
  {
    emoji: "🚗",
    title: "Карпулинг",
    description:
      "Организуйте совместные поездки: водители указывают свободные места, пассажиры находят попутчиков в пару кликов.",
  },
];

export default function Features() {
  return (
    <section id="features" className="bg-slate-50 py-24">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            Всё что нужно для встречи
          </h2>
          <p className="text-lg text-slate-500 max-w-xl mx-auto">
            Четыре ключевые возможности, которые избавят от лишних чатов и
            таблиц.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="text-4xl mb-4">{f.emoji}</div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                {f.title}
              </h3>
              <p className="text-slate-500 leading-relaxed text-sm">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
