#!/usr/bin/env bash
# Corta, nivela o áudio e exporta um vídeo do OBS em 1080p30.
#
# Uso:
#   ./editar.sh entrada.mov                      # normaliza áudio e exporta
#   ./editar.sh entrada.mov 12 98                # corta de 12s a 98s
#   ./editar.sh entrada.mov 12 98 legenda.srt    # + legenda queimada (exige ffmpeg com libass)
#
# Saída: <entrada>-final.mp4 ao lado do arquivo original.

set -euo pipefail

IN="${1:?informe o arquivo de entrada}"
START="${2:-}"
END="${3:-}"
SRT="${4:-}"

if [[ ! -f "$IN" ]]; then
  echo "arquivo não encontrado: $IN" >&2
  exit 1
fi

OUT="${IN%.*}-final.mp4"
VF=""
AF="loudnorm=I=-16:TP=-1.5:LRA=11"

if [[ -n "$SRT" ]]; then
  if [[ ! -f "$SRT" ]]; then
    echo "legenda não encontrada: $SRT" >&2
    exit 1
  fi
  if ffmpeg -hide_banner -filters 2>/dev/null | grep -q ' subtitles '; then
    # Caminho absoluto e escapado: ':' e "'" quebram a sintaxe do filtro.
    ABS=$(cd "$(dirname "$SRT")" && pwd)/$(basename "$SRT")
    ESC=$(printf '%s' "$ABS" | sed "s/\\\\/\\\\\\\\/g; s/:/\\\\:/g; s/'/\\\\'/g")
    VF="subtitles='$ESC':force_style='Fontname=Helvetica Neue,Fontsize=21,BorderStyle=4,Outline=1,Shadow=0,MarginV=38'"
  else
    echo "aviso: este ffmpeg não tem libass; o vídeo sai sem legenda queimada" >&2
  fi
fi

ARGS=()
[[ -n "$START" ]] && ARGS+=(-ss "$START")
[[ -n "$END" ]] && ARGS+=(-to "$END")

VF_ARGS=()
if [[ -n "$VF" ]]; then
  FILTER_FILE=$(mktemp -t raiz-filter)
  trap 'rm -f "$FILTER_FILE"' EXIT
  printf '%s' "$VF" > "$FILTER_FILE"
  VF_ARGS=(-filter_script:v "$FILTER_FILE")
fi

ffmpeg -hide_banner -loglevel warning -stats ${ARGS[@]+"${ARGS[@]}"} -i "$IN" \
  ${VF_ARGS[@]+"${VF_ARGS[@]}"} -af "$AF" \
  -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -r 30 \
  -c:a aac -b:a 192k -ar 48000 \
  -movflags +faststart -y "$OUT"

ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height,r_frame_rate \
  -of default=noprint_wrappers=1 "$OUT"
echo "ok: $OUT"
