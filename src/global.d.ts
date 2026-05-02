/**
 * esbuild `loader: { '.css': 'text' }` 설정으로 CSS 파일을 문자열로 임포트할 때 사용하는 타입 선언.
 * swagger-ui-dist/swagger-ui.css 를 ApiRenderer 에서 인라인으로 주입하기 위해 필요하다.
 */
declare module '*.css' {
  const content: string;
  export default content;
}

/** esbuild `loader: { '.md': 'text' }` 로 템플릿 파일을 문자열로 임포트할 때 사용 */
declare module '*.md' {
  const content: string;
  export default content;
}
