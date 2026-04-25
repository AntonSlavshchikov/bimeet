const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "#";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-700 text-white">
      {/* decorative blobs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-white/5 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-white/5 blur-3xl pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-6 py-28 text-center">
        <span className="inline-block mb-6 px-4 py-1.5 rounded-full bg-white/15 text-sm font-medium tracking-wide">
          Бесплатно · Без регистрации карты
        </span>

        <h1 className="text-5xl sm:text-6xl font-extrabold leading-tight tracking-tight mb-6">
          Организуйте встречи{" "}
          <span className="text-yellow-300">без хаоса</span>
        </h1>

        <p className="max-w-2xl mx-auto text-lg sm:text-xl text-white/80 leading-relaxed mb-10">
          Bimeet объединяет всё необходимое: управление участниками, совместные
          сборы, опросы, карпулинг и история изменений — в одном удобном
          приложении.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href={APP_URL}
            className="inline-flex items-center justify-center px-8 py-4 rounded-2xl bg-white text-indigo-700 font-bold text-base shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-200"
          >
            Попробовать бесплатно →
          </a>
          <a
            href="#features"
            className="inline-flex items-center justify-center px-8 py-4 rounded-2xl border border-white/30 text-white font-semibold text-base hover:bg-white/10 transition-colors duration-200"
          >
            Узнать больше
          </a>
        </div>

        <p className="mt-8 text-white/50 text-sm">
          Уже используют сотни команд и организаторов
        </p>
      </div>
    </section>
  );
}
