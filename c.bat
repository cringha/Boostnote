set cmd_7z="C:\Program Files\7-Zip\7z.exe"
set cmd_scp="D:\Person\program\putty\PSCP.EXE"
set file_main_7z="compiled\main.7z"
copy compiled\main.js C:\Users\cn1lk0x0\AppData\Local\boost\app-0.11.4\resources\app\compiled
del /y %file_main_7z%
%cmd_7z% a %file_main_7z% compiled\main.js 

%cmd_scp% -P 25122 -pw crp@iot %file_main_7z%  platform@172.17.2.220:/apps/solo/uploads