// Shown when the subdomain does not match any company.
export default function CompanyNotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-[360px]">
        <div className="h-12 w-12 mx-auto mb-4 rounded-[12px] bg-bg-2 border border-line flex items-center justify-center text-[22px]">
          🏢
        </div>
        <h1 className="text-[18px] font-bold text-ink">Компания не найдена</h1>
        <p className="mt-2 text-[14px] text-ink-3">
          На этом адресе нет рабочего пространства. Проверьте поддомен или
          зарегистрируйте новую компанию на <span className="font-semibold text-ink-2">company.bimeet.pro</span>.
        </p>
      </div>
    </div>
  )
}
