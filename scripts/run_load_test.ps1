param(
    [string[]]$K6Args = @(),
    [switch]$SkipSetup
)

if (-not $SkipSetup) {
    k6 run .\k6-tests\setup.ts @K6Args
}
clear
k6 run .\k6-tests\create_pet.ts @K6Args
k6 run .\k6-tests\create_user.ts @K6Args
k6 run .\k6-tests\find_admins.ts @K6Args
k6 run .\k6-tests\find_bunnies.ts @K6Args
k6 run .\k6-tests\find_pets.ts @K6Args
k6 run .\k6-tests\find_users.ts @K6Args
k6 run .\k6-tests\get_pet.ts @K6Args
k6 run .\k6-tests\get_status.ts @K6Args
k6 run .\k6-tests\get_user.ts @K6Args
k6 run .\k6-tests\login.ts @K6Args
