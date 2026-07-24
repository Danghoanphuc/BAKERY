export function PosSkeleton() {
  return (
    <div className="grid min-h-0 grid-cols-1 overflow-hidden rounded-3xl border border-[#f0e1d2] bg-[#f5f0eb] shadow-sm xl:h-[calc(100vh-3rem)] xl:grid-cols-[minmax(0,1fr)_360px] xl:overflow-hidden 2xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="flex min-h-[65vh] min-w-0 flex-col xl:min-h-0">
        <div className="border-b border-[#f0e1d2] bg-white">
          <div className="grid gap-2.5 px-3 py-2.5 xl:grid-cols-[minmax(180px,0.75fr)_minmax(240px,1.25fr)] xl:items-center">
            <div className="min-w-0">
              <div className="h-6 w-32 animate-pulse rounded-lg bg-[#f4ebe1]" />
              <div className="mt-1.5 h-3.5 w-48 animate-pulse rounded bg-[#f4ebe1]" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-10 flex-1 animate-pulse rounded-xl bg-[#f4ebe1]" />
              <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-[#f4ebe1]" />
              <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-[#f4ebe1]" />
            </div>
          </div>
          <div className="border-t border-[#f7eadf] px-3 py-2">
            <div className="flex gap-2 overflow-hidden">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="h-9 w-24 shrink-0 animate-pulse rounded-full bg-[#f4ebe1]"
                />
              ))}
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-hidden p-3">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(126px,1fr))] gap-2.5 xl:grid-cols-4">
            {Array.from({ length: 12 }).map((_, index) => (
              <div
                key={index}
                className="flex h-[168px] flex-col overflow-hidden rounded-xl border border-[#eadbcc] bg-white"
              >
                <div className="h-[82px] shrink-0 animate-pulse bg-[#f4ebe1]" />
                <div className="flex flex-1 flex-col px-2.5 py-2.5">
                  <div className="h-4 w-full animate-pulse rounded bg-[#f4ebe1]" />
                  <div className="mt-1 h-4 w-2/3 animate-pulse rounded bg-[#f4ebe1]" />
                  <div className="mt-auto pt-1 h-3.5 w-16 animate-pulse rounded bg-[#f4ebe1]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <aside className="flex min-h-0 flex-col border-t border-[#f0e1d2] bg-white xl:border-l xl:border-t-0">
        <div className="border-b border-[#f0e1d2] p-4">
          <div className="h-6 w-28 animate-pulse rounded-lg bg-[#f4ebe1]" />
          <div className="mt-1.5 h-3.5 w-20 animate-pulse rounded bg-[#f4ebe1]" />
        </div>
        <div className="flex-1 p-4">
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="grid grid-cols-[48px_1fr_auto] gap-3 rounded-2xl bg-[#fffaf6] p-3 ring-1 ring-[#f0e1d2]"
              >
                <div className="h-12 w-12 animate-pulse rounded-xl bg-[#f4ebe1]" />
                <div className="space-y-2">
                  <div className="h-4 w-24 animate-pulse rounded bg-[#f4ebe1]" />
                  <div className="h-3 w-16 animate-pulse rounded bg-[#f4ebe1]" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 animate-pulse rounded-full bg-[#f4ebe1]" />
                  <div className="h-3 w-6 animate-pulse rounded bg-[#f4ebe1]" />
                  <div className="h-7 w-7 animate-pulse rounded-full bg-[#f4ebe1]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
      <aside className="flex min-h-0 flex-col overflow-y-auto border-t border-[#f0e1d2] bg-white xl:border-l xl:border-t-0">
        <div className="border-b border-[#f0e1d2] p-4">
          <div className="space-y-3">
            <div className="h-16 animate-pulse rounded-xl bg-[#f4ebe1]" />
            <div className="h-20 animate-pulse rounded-xl bg-[#f4ebe1]" />
          </div>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            <div className="h-12 animate-pulse rounded-xl bg-[#f4ebe1]" />
            <div className="h-24 animate-pulse rounded-2xl bg-[#f4ebe1]" />
            <div className="h-12 animate-pulse rounded-xl bg-[#b84a39]/30" />
          </div>
        </div>
      </aside>
    </div>
  );
}
