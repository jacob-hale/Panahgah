using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Panahgah.Api.Models;

namespace Panahgah.Api.Data;

public class AuthIdentityDbContext(DbContextOptions<AuthIdentityDbContext> options)
    : IdentityDbContext<ApplicationUser, IdentityRole, string>(options)
{
}
