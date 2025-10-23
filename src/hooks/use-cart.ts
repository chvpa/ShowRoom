// Este archivo puede parecer redundante, pero ayuda a mantener la consistencia
// en la forma en que se importan los hooks (todos desde la carpeta /hooks).
// Si el hook useCart se vuelve más complejo o necesita lógica adicional 
// fuera del contexto, este archivo sería el lugar para ello.

export { useCart } from '@/contexts/cart-context';