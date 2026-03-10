import { useState, useEffect, useCallback } from "react";
import { getLang, setLang as setLangFn, t, LangCode } from "@/lib/i18n";

export function useLanguage() {
  const [lang, setLangState] = useState<LangCode>(getLang());
  
  const refresh = useCallback(() => {
    setLangState(getLang());
  }, []);

  useEffect(() => {
    window.addEventListener("lang-change", refresh);
    return () => window.removeEventListener("lang-change", refresh);
  }, [refresh]);

  const changeLang = useCallback((code: LangCode) => {
    setLangFn(code);
    setLangState(code);
  }, []);

  return { lang, changeLang, t };
}
