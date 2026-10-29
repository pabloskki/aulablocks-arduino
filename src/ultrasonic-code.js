// One cache per physical TRIG/ECHO pair; unsigned subtraction survives millis rollover.
export function ultrasonicHelper(name, trig, echo) {
  return `float ${name}() {
  static bool iniciada = false;
  static unsigned long ultima = 0;
  static float distancia = NAN;
  if (iniciada && (unsigned long)(millis() - ultima) < 60UL) return distancia;
  digitalWrite(${trig}, LOW);
  delayMicroseconds(2);
  digitalWrite(${trig}, HIGH);
  delayMicroseconds(10);
  digitalWrite(${trig}, LOW);
  unsigned long duracion = pulseIn(${echo}, HIGH, 30000UL);
  distancia = duracion ? duracion * 0.0343f / 2.0f : NAN;
  ultima = millis();
  iniciada = true;
  return distancia;
}`;
}
