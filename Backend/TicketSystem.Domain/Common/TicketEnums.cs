namespace TicketSystem.Domain.Common;

// Ticket type: Individual or Group
public enum TicketMode
{
    INDIVIDUAL = 1,
    GROUP = 2
}

// Usage type for individual tickets
public enum UsageType
{
    ONE_TIME = 1,
    MULTI_DAY = 2
}

// QR code type for group tickets
public enum QRMode
{
    SINGLE_QR = 1,
    SUB_QR = 2
}

// Pricing mode for group tickets
public enum PriceMode
{
    PER_TICKET = 1,
    PER_GROUP = 2
}

// Preset names for individual tickets
public static class IndividualTicketPresets
{
    public const string REGULAR = "Vé thường";
    public const string VIP = "Vé VIP";
    public const string STUDENT = "Vé Student";
    public const string PREMIUM = "Vé Premium";
    public const string EARLY_BIRD = "Vé Early Bird";
    public const string CUSTOM = "Vé Custom";

    public static List<string> GetPresets() => new()
    {
        REGULAR,
        VIP,
        STUDENT,
        PREMIUM,
        EARLY_BIRD
    };
}

// Preset names for group tickets
public static class GroupTicketPresets
{
    public const string REGULAR = "Vé đoàn thường";
    public const string VIP = "Vé đoàn VIP";
    public const string COMPANY = "Vé đoàn công ty";
    public const string STUDENT = "Vé đoàn học sinh";
    public const string CUSTOM = "Vé đoàn Custom";

    public static List<string> GetPresets() => new()
    {
        REGULAR,
        VIP,
        COMPANY,
        STUDENT
    };
}
